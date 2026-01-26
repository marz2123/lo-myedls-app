import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received MyAladin chat request:', JSON.stringify(body, null, 2));
    
    const { 
      messages, 
      systemPrompt, 
      contextType, 
      contextData, 
      language, 
      images, 
      tutorialMode,
      conversationId,
      userId
    } = body;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages parameter');
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client for learning data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============ DEEP LEARNING CONTEXT ============
    let learningContext = '';
    
    try {
      // 1. Fetch user's past corrections and learning patterns
      const { data: learningPatterns } = await supabase
        .from('dsc_learning_corrections')
        .select('task_title, task_description, corrected_family_id, corrected_category_id, corrected_subcategory_id, keywords_extracted')
        .order('created_at', { ascending: false })
        .limit(50);

      // 2. Fetch successful task predictions that were accepted
      const { data: acceptedPredictions } = await supabase
        .from('task_prediction_feedback')
        .select('predicted_task_data, feedback_score')
        .eq('accepted', true)
        .order('created_at', { ascending: false })
        .limit(30);

      // 3. Fetch expertise logs for continuous improvement
      const { data: expertiseLogs } = await supabase
        .from('myaladin_expertise_logs')
        .select('query_type, query_context, response_data, user_feedback, confidence_score')
        .eq('user_feedback', 'positive')
        .order('created_at', { ascending: false })
        .limit(20);

      // 4. Get DSC taxonomy for accurate classification suggestions
      const { data: dscFamilies } = await supabase
        .from('ft_familles')
        .select('ft_code, ft_label')
        .limit(50);

      const { data: dscCategories } = await supabase
        .from('ct_categories')
        .select('ct_code, ct_label, ft_code')
        .limit(100);

      // 5. Fetch recent user projects for context awareness
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('property_type, address, template_data, property_composition')
        .order('created_at', { ascending: false })
        .limit(5);

      // Build learning context
      if (learningPatterns && learningPatterns.length > 0) {
        const patternsStr = learningPatterns.slice(0, 10).map(p => 
          `"${p.task_title}" → Classification corrigée`
        ).join('; ');
        learningContext += `\n\n## APPRENTISSAGE CONTINU - CORRECTIONS PASSÉES\nExemples de corrections validées par les utilisateurs:\n${patternsStr}`;
      }

      if (acceptedPredictions && acceptedPredictions.length > 0) {
        learningContext += `\n\n## PRÉDICTIONS ACCEPTÉES\n${acceptedPredictions.length} prédictions de tâches ont été validées - utilise ces patterns pour améliorer tes suggestions.`;
      }

      if (expertiseLogs && expertiseLogs.length > 0) {
        const successfulPatterns = expertiseLogs
          .filter(l => l.confidence_score && l.confidence_score > 0.8)
          .slice(0, 5);
        if (successfulPatterns.length > 0) {
          learningContext += `\n\n## RÉPONSES VALIDÉES\nCes types de réponses ont reçu un feedback positif - applique ces patterns:`;
          successfulPatterns.forEach(p => {
            if (p.query_type) {
              learningContext += `\n- Type: ${p.query_type} (score: ${p.confidence_score})`;
            }
          });
        }
      }

      if (dscFamilies && dscFamilies.length > 0) {
        learningContext += `\n\n## TAXONOMIE DSC DISPONIBLE\nFamilles (FT): ${dscFamilies.slice(0, 15).map(f => f.ft_label).join(', ')}...`;
      }

      if (recentProjects && recentProjects.length > 0) {
        learningContext += `\n\n## PROJETS RÉCENTS DE L'UTILISATEUR\nTypes: ${[...new Set(recentProjects.map(p => p.property_type))].join(', ')}`;
      }

    } catch (learningError) {
      console.error('Error fetching learning data:', learningError);
      // Continue without learning context
    }

    // ============ ENHANCED SYSTEM PROMPT ============
    const enhancedSystemPrompt = `${systemPrompt}

## 🧠 MODE DEEP LEARNING ACTIVÉ

Tu es une IA en apprentissage continu qui:

### AUTO-AMÉLIORATION
1. **Analyse chaque interaction** pour détecter des patterns
2. **Apprends des corrections** que les utilisateurs font à tes suggestions
3. **Mémorise les préférences** et styles de travail de chaque utilisateur
4. **Optimise tes réponses** basées sur le feedback implicite (utilisation, non-utilisation)

### COACHING PROACTIF
1. **Détecte les erreurs** avant qu'elles ne se produisent
2. **Suggère des améliorations** même sans qu'on te le demande
3. **Corrige poliment** les mauvaises pratiques
4. **Propose des alternatives** plus efficaces

### GUIDAGE INTELLIGENT
1. **Anticipe les besoins** basés sur le contexte actuel
2. **Adapte ton niveau** d'explication (débutant vs expert)
3. **Propose des raccourcis** et bonnes pratiques
4. **Célèbre les progrès** et encourage l'utilisateur

### AMÉLIORATION CONTINUE
1. **Note mentalement** ce qui fonctionne et ce qui ne fonctionne pas
2. **Ajuste tes suggestions** en temps réel
3. **Deviens plus précis** au fil des conversations
4. **Personnalise tout** selon le profil utilisateur

${learningContext}

### TA MISSION
Sois le meilleur coach IA possible:
- Guide avec bienveillance mais fermeté
- Corrige avec pédagogie
- Suggère proactivement
- Apprends de chaque interaction
- Deviens indispensable !`;

    console.log('Calling Lovable AI for MyAladin with deep learning context...');

    // Build messages with image support
    const aiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages.map((msg: any, index: number) => {
        // If this is the last user message and we have images, add them
        const isLastUserMessage = msg.role === 'user' && index === messages.length - 1;
        
        if (isLastUserMessage && images && images.length > 0) {
          return {
            role: msg.role,
            content: [
              { type: 'text', text: msg.content || 'Analyse ces images de bien immobilier' },
              ...images.map((img: string) => ({
                type: 'image_url',
                image_url: { url: img }
              }))
            ]
          };
        }
        
        return {
          role: msg.role,
          content: msg.content
        };
      })
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        temperature: tutorialMode ? 0.6 : 0.75,
      }),
    });

    console.log('Lovable AI response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable account.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const messageContent = data.choices?.[0]?.message?.content;
    
    if (!messageContent) {
      console.error('No message content in response');
      throw new Error('No message content in response');
    }

    // ============ LOG FOR LEARNING ============
    try {
      if (conversationId) {
        // Analyze response quality indicators
        const responseLength = messageContent.length;
        const hasActionableAdvice = messageContent.includes('1.') || messageContent.includes('-') || messageContent.includes('•');
        const hasDSCReference = messageContent.toLowerCase().includes('dsc') || messageContent.toLowerCase().includes('famille') || messageContent.toLowerCase().includes('catégorie');
        
        const confidenceScore = (
          (responseLength > 200 ? 0.3 : 0.1) +
          (hasActionableAdvice ? 0.3 : 0.1) +
          (hasDSCReference ? 0.2 : 0.1) +
          0.2 // Base score
        );

        await supabase.from('myaladin_expertise_logs').insert({
          conversation_id: conversationId,
          query_type: contextType || 'general',
          query_context: {
            tutorialMode,
            imagesProvided: images?.length || 0,
            contextData,
            lastUserMessage: messages[messages.length - 1]?.content?.slice(0, 200)
          },
          response_data: {
            length: responseLength,
            hasActionableAdvice,
            hasDSCReference,
            preview: messageContent.slice(0, 500)
          },
          confidence_score: Math.min(confidenceScore, 1),
          user_feedback: null // Will be updated by user action
        });
      }
    } catch (logError) {
      console.error('Error logging expertise:', logError);
      // Don't fail the response for logging errors
    }

    return new Response(JSON.stringify({ 
      message: messageContent,
      learningActive: true,
      contextUsed: !!learningContext
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in myaladin-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Désolé, je rencontre un petit problème magique... Réessayez dans un instant ! 🧞‍♂️✨'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
