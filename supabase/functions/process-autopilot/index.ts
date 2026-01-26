import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AutopilotRequest {
  sessionId: string;
  videoUrl?: string;
  frames?: { url: string; timestamp: number }[];
}

// Room types for detection
const ROOM_TYPES = [
  'cuisine', 'séjour', 'salon', 'chambre', 'salle de bain', 'wc', 'toilettes',
  'entrée', 'couloir', 'dégagement', 'bureau', 'buanderie', 'cave', 'garage',
  'terrasse', 'balcon', 'jardin', 'grenier', 'combles', 'palier'
];

// Elements to detect in each room
const ELEMENTS_TO_DETECT = [
  'sol', 'murs', 'plafond', 'fenêtres', 'portes', 'radiateurs', 'prises électriques',
  'interrupteurs', 'éclairage', 'plinthes', 'menuiseries', 'volets', 'stores',
  'robinetterie', 'sanitaires', 'éviers', 'plan de travail', 'placards', 'rangements',
  'cheminée', 'VMC', 'compteurs', 'tableaux électriques'
];

// Anomalies to detect
const ANOMALY_TYPES = [
  'fissure', 'tache humidité', 'moisissure', 'décollement peinture', 'éclat',
  'rayure', 'déformation', 'vitre cassée', 'joint défectueux', 'corrosion',
  'usure', 'dégradation', 'luminaire hs', 'prise endommagée', 'porte mal alignée'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { sessionId, videoUrl, frames }: AutopilotRequest = await req.json();

    console.log(`[Autopilot] Starting analysis for session ${sessionId}`);

    // Update session status to processing
    await supabase
      .from('autopilot_sessions')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    // Process frames for room segmentation and element detection
    const processedSegments: any[] = [];
    const detectedItems: any[] = [];
    const confidenceMetrics: any[] = [];

    if (frames && frames.length > 0) {
      // Group frames by detected room
      let currentRoom: string | null = null;
      let currentSegmentFrames: any[] = [];
      let segmentIndex = 0;

      for (const frame of frames) {
        // Analyze frame with AI Vision
        const frameAnalysis = await analyzeFrame(frame.url, frame.timestamp);
        
        // Detect room transition
        if (frameAnalysis.detectedRoom !== currentRoom) {
          // Save previous segment if exists
          if (currentRoom && currentSegmentFrames.length > 0) {
            const segment = await processSegment(
              supabase,
              sessionId,
              segmentIndex,
              currentRoom,
              currentSegmentFrames
            );
            processedSegments.push(segment);
            segmentIndex++;
          }
          
          currentRoom = frameAnalysis.detectedRoom;
          currentSegmentFrames = [{ ...frame, analysis: frameAnalysis }];
        } else {
          currentSegmentFrames.push({ ...frame, analysis: frameAnalysis });
        }

        // Store detected items
        for (const element of frameAnalysis.elements) {
          detectedItems.push({
            session_id: sessionId,
            item_type: element.type,
            item_label: element.label,
            element_category: element.category,
            material_detected: element.material,
            state: element.state,
            confidence_score: element.confidence,
            frame_url: frame.url,
            timestamp_seconds: frame.timestamp,
            description_generated: element.description,
            anomalies: element.anomalies || [],
            tasks: element.tasks || []
          });
        }
      }

      // Process last segment
      if (currentRoom && currentSegmentFrames.length > 0) {
        const segment = await processSegment(
          supabase,
          sessionId,
          segmentIndex,
          currentRoom,
          currentSegmentFrames
        );
        processedSegments.push(segment);
      }
    }

    // Insert segments
    if (processedSegments.length > 0) {
      await supabase.from('autopilot_segments').insert(processedSegments);
    }

    // Insert detected items
    if (detectedItems.length > 0) {
      await supabase.from('autopilot_detected_items').insert(detectedItems);
    }

    // Calculate confidence metrics
    const roomDetectionConfidence = processedSegments.reduce((acc, s) => acc + (s.confidence_score || 0), 0) / Math.max(processedSegments.length, 1);
    const elementDetectionConfidence = detectedItems.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / Math.max(detectedItems.length, 1);
    
    confidenceMetrics.push(
      { session_id: sessionId, metric_type: 'detection', metric_name: 'room_detection', score: roomDetectionConfidence },
      { session_id: sessionId, metric_type: 'detection', metric_name: 'element_detection', score: elementDetectionConfidence },
      { session_id: sessionId, metric_type: 'coverage', metric_name: 'room_coverage', score: Math.min(processedSegments.length / 5, 1) * 100 }
    );

    await supabase.from('autopilot_confidence').insert(confidenceMetrics);

    // Generate EDL report
    const edlReport = await generateEDLReport(processedSegments, detectedItems);

    // Count totals
    const totalAnomalies = detectedItems.reduce((acc, item) => acc + (item.anomalies?.length || 0), 0);
    const totalTasks = detectedItems.reduce((acc, item) => acc + (item.tasks?.length || 0), 0);
    const overallConfidence = (roomDetectionConfidence + elementDetectionConfidence) / 2;

    // Update session with results
    await supabase
      .from('autopilot_sessions')
      .update({
        status: 'ready',
        processing_completed_at: new Date().toISOString(),
        total_rooms_detected: processedSegments.length,
        total_elements_detected: detectedItems.length,
        total_anomalies_detected: totalAnomalies,
        total_tasks_generated: totalTasks,
        total_photos_extracted: frames?.length || 0,
        overall_confidence_score: overallConfidence,
        edl_report_json: edlReport
      })
      .eq('id', sessionId);

    console.log(`[Autopilot] Analysis complete for session ${sessionId}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      summary: {
        roomsDetected: processedSegments.length,
        elementsDetected: detectedItems.length,
        anomaliesDetected: totalAnomalies,
        tasksGenerated: totalTasks,
        photosExtracted: frames?.length || 0,
        confidenceScore: overallConfidence
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Autopilot] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeFrame(frameUrl: string, timestamp: number) {
  if (!LOVABLE_API_KEY) {
    // Fallback analysis without AI
    return {
      detectedRoom: ROOM_TYPES[Math.floor(timestamp / 10) % ROOM_TYPES.length],
      elements: [],
      anomalies: []
    };
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en états des lieux immobiliers. Analyse cette image et détecte:
1. Le type de pièce (${ROOM_TYPES.join(', ')})
2. Les éléments visibles (${ELEMENTS_TO_DETECT.slice(0, 10).join(', ')}...)
3. L'état de chaque élément (neuf, bon, moyen, mauvais, absent)
4. Les matériaux détectés
5. Les anomalies (${ANOMALY_TYPES.slice(0, 5).join(', ')}...)

Réponds en JSON avec ce format:
{
  "room": "type de pièce",
  "roomConfidence": 0.95,
  "elements": [
    {
      "type": "sol",
      "label": "Sol parquet",
      "category": "revêtement",
      "material": "parquet chêne",
      "state": "bon",
      "confidence": 0.9,
      "description": "Sol en parquet chêne massif, bon état général",
      "anomalies": [],
      "tasks": []
    }
  ]
}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyse cette image pour un état des lieux:' },
              { type: 'image_url', image_url: { url: frameUrl } }
            ]
          }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      console.error('[Autopilot] AI Vision error:', response.status);
      return { detectedRoom: 'inconnu', elements: [], anomalies: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detectedRoom: parsed.room || 'inconnu',
        roomConfidence: parsed.roomConfidence || 0.8,
        elements: parsed.elements || [],
        anomalies: []
      };
    }

    return { detectedRoom: 'inconnu', elements: [], anomalies: [] };
  } catch (error) {
    console.error('[Autopilot] Frame analysis error:', error);
    return { detectedRoom: 'inconnu', elements: [], anomalies: [] };
  }
}

async function processSegment(
  supabase: any,
  sessionId: string,
  segmentIndex: number,
  roomType: string,
  frames: any[]
) {
  const startTime = frames[0]?.timestamp || 0;
  const endTime = frames[frames.length - 1]?.timestamp || startTime;
  
  // Aggregate elements from all frames
  const allElements = frames.flatMap(f => f.analysis?.elements || []);
  const uniqueElements = aggregateElements(allElements);
  
  // Detect anomalies
  const allAnomalies = uniqueElements.flatMap(e => e.anomalies || []);
  
  // Generate description
  const description = await generateRoomDescription(roomType, uniqueElements, allAnomalies);
  
  // Generate tasks from anomalies
  const tasks = generateTasksFromAnomalies(allAnomalies, roomType);
  
  // Calculate global state
  const states = uniqueElements.map(e => e.state).filter(Boolean);
  const globalState = calculateGlobalState(states);
  
  // Average confidence
  const avgConfidence = uniqueElements.reduce((acc, e) => acc + (e.confidence || 0), 0) / Math.max(uniqueElements.length, 1);

  return {
    session_id: sessionId,
    segment_index: segmentIndex,
    room_type: roomType,
    room_label: formatRoomLabel(roomType, segmentIndex),
    start_time_seconds: startTime,
    end_time_seconds: endTime,
    confidence_score: avgConfidence,
    preview_frame_url: frames[Math.floor(frames.length / 2)]?.url,
    elements_detected: uniqueElements,
    anomalies_detected: allAnomalies,
    global_state: globalState,
    description_generated: description,
    tasks_generated: tasks,
    coverage_analysis: {
      elementsCount: uniqueElements.length,
      anomaliesCount: allAnomalies.length,
      framesAnalyzed: frames.length
    }
  };
}

function aggregateElements(elements: any[]) {
  const elementMap = new Map();
  
  for (const element of elements) {
    const key = `${element.type}-${element.material || 'unknown'}`;
    if (!elementMap.has(key)) {
      elementMap.set(key, element);
    } else {
      // Keep higher confidence version
      const existing = elementMap.get(key);
      if ((element.confidence || 0) > (existing.confidence || 0)) {
        elementMap.set(key, element);
      }
    }
  }
  
  return Array.from(elementMap.values());
}

function calculateGlobalState(states: string[]): string {
  if (states.length === 0) return 'bon';
  
  const stateScores: Record<string, number> = {
    'neuf': 5,
    'bon': 4,
    'moyen': 3,
    'mauvais': 2,
    'absent': 1
  };
  
  const avgScore = states.reduce((acc, s) => acc + (stateScores[s] || 3), 0) / states.length;
  
  if (avgScore >= 4.5) return 'neuf';
  if (avgScore >= 3.5) return 'bon';
  if (avgScore >= 2.5) return 'moyen';
  return 'mauvais';
}

function formatRoomLabel(roomType: string, index: number): string {
  const label = roomType.charAt(0).toUpperCase() + roomType.slice(1);
  if (roomType === 'chambre') return `${label} ${index + 1}`;
  return label;
}

async function generateRoomDescription(roomType: string, elements: any[], anomalies: any[]): Promise<string> {
  const elementsDesc = elements.map(e => `${e.label}: ${e.state || 'état non déterminé'}`).join('. ');
  const anomaliesDesc = anomalies.length > 0 
    ? `Anomalies constatées: ${anomalies.map(a => a.type || a.description).join(', ')}.`
    : 'Aucune anomalie constatée.';
  
  return `${formatRoomLabel(roomType, 0)} - ${elementsDesc}. ${anomaliesDesc}`;
}

function generateTasksFromAnomalies(anomalies: any[], roomType: string): any[] {
  return anomalies.map((anomaly, index) => ({
    id: `task-${Date.now()}-${index}`,
    title: `Réparer ${anomaly.type || 'anomalie'}`,
    description: anomaly.description || `Intervention requise dans ${roomType}`,
    priority: anomaly.severity === 'high' ? 'haute' : 'normale',
    ft_family: 'Réparations',
    category: 'Travaux correctifs',
    subcategory: 'Réparation standard',
    location: roomType,
    quantity: anomaly.quantity || 1,
    unit: anomaly.unit || 'u'
  }));
}

async function generateEDLReport(segments: any[], items: any[]) {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRooms: segments.length,
      totalElements: items.length,
      globalCondition: calculateGlobalState(segments.map(s => s.global_state)),
      completionRate: 100
    },
    rooms: segments.map(segment => ({
      name: segment.room_label,
      type: segment.room_type,
      state: segment.global_state,
      description: segment.description_generated,
      elements: segment.elements_detected,
      anomalies: segment.anomalies_detected,
      tasks: segment.tasks_generated,
      photos: [segment.preview_frame_url].filter(Boolean)
    })),
    recommendations: segments.flatMap(s => s.tasks_generated || []),
    metadata: {
      analysisEngine: 'MyEDLs Autopilot v1.0',
      aiModel: 'google/gemini-2.5-flash'
    }
  };
}
