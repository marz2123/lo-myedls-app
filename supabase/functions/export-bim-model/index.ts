import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportBIMRequest {
  modelId: string;
  format: "ifc" | "gltf" | "obj" | "usdz";
  options?: {
    includeTextures?: boolean;
    includeMaterials?: boolean;
    includeAnomalies?: boolean;
    includeTasks?: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { modelId, format, options = {} }: ExportBIMRequest = await req.json();

    if (!modelId || !format) {
      return new Response(JSON.stringify({ error: "Model ID and format required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch BIM model
    const { data: model, error: modelError } = await supabase
      .from("edl_bim_models")
      .select("*")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch surfaces
    const { data: surfaces } = await supabase
      .from("edl_bim_surfaces")
      .select("*")
      .eq("model_id", modelId);

    // Fetch objects
    const { data: objects } = await supabase
      .from("edl_bim_objects")
      .select("*")
      .eq("model_id", modelId);

    // Generate export based on format
    let exportContent: string;
    let contentType: string;
    let fileName: string;

    switch (format) {
      case "ifc":
        exportContent = generateIFC(model, surfaces || [], objects || [], options);
        contentType = "application/x-step";
        fileName = `bim_model_${modelId}.ifc`;
        break;

      case "gltf":
        exportContent = generateGLTF(model, surfaces || [], objects || [], options);
        contentType = "model/gltf+json";
        fileName = `bim_model_${modelId}.gltf`;
        break;

      case "obj":
        exportContent = generateOBJ(model, surfaces || [], objects || [], options);
        contentType = "text/plain";
        fileName = `bim_model_${modelId}.obj`;
        break;

      case "usdz":
        // USDZ requires binary format, simplified for demo
        exportContent = generateUSDA(model, surfaces || [], objects || [], options);
        contentType = "model/vnd.usdz+zip";
        fileName = `bim_model_${modelId}.usda`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unsupported format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bim-exports")
      .upload(`${user.id}/${fileName}`, exportContent, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // Create bucket if not exists
      await supabase.storage.createBucket("bim-exports", { public: false });
      
      const { data: retryUpload, error: retryError } = await supabase.storage
        .from("bim-exports")
        .upload(`${user.id}/${fileName}`, exportContent, {
          contentType,
          upsert: true,
        });

      if (retryError) {
        console.error("Upload error:", retryError);
      }
    }

    // Get signed URL
    const { data: signedUrl } = await supabase.storage
      .from("bim-exports")
      .createSignedUrl(`${user.id}/${fileName}`, 3600);

    // Update model with export URL
    const urlField = `${format}_url`;
    await supabase
      .from("edl_bim_models")
      .update({ [urlField]: signedUrl?.signedUrl })
      .eq("id", modelId);

    return new Response(JSON.stringify({
      success: true,
      format,
      fileName,
      downloadUrl: signedUrl?.signedUrl,
      size: exportContent.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("BIM export error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateIFC(model: any, surfaces: any[], objects: any[], options: any): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  
  let ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${model.id}.ifc','${timestamp}',('MyEDLs'),('MyHome'),'','IFC4');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('${model.id}',#2,'EDL BIM Model',$,$,$,$,(#20),#9);
#2=IFCOWNERHISTORY(#3,#6,$,.NOCHANGE.,$,$,$,${Date.now()});
#3=IFCPERSONANDORGANIZATION(#4,#5,$);
#4=IFCPERSON($,'MyEDLs','User',$,$,$,$,$);
#5=IFCORGANIZATION($,'MyHome','MyHome SAS',$,$);
#6=IFCAPPLICATION(#5,'1.0','MyEDLs BIM','MYEDLS');
#7=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#8=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#9=IFCUNITASSIGNMENT((#7,#8));
#10=IFCCARTESIANPOINT((0.,0.,0.));
#11=IFCDIRECTION((0.,0.,1.));
#12=IFCDIRECTION((1.,0.,0.));
#13=IFCAXIS2PLACEMENT3D(#10,#11,#12);
#14=IFCLOCALPLACEMENT($,#13);
#15=IFCSITE('site_${model.id}',#2,'Site',$,$,#14,$,$,.ELEMENT.,$,$,$,$,$);
#16=IFCBUILDING('building_${model.id}',#2,'Building',$,$,#14,$,$,.ELEMENT.,$,$,$);
#17=IFCBUILDINGSTOREY('storey_${model.id}',#2,'Level 0',$,$,#14,$,$,.ELEMENT.,0.);
#18=IFCRELAGGREGATES('rel1',#2,$,$,#1,(#15));
#19=IFCRELAGGREGATES('rel2',#2,$,$,#15,(#16));
#20=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#13,$);
`;

  let entityId = 100;

  // Add spaces (rooms)
  surfaces.forEach((surface, index) => {
    const length = Math.sqrt(surface.surface_m2 || 20);
    const width = length;
    const height = surface.hauteur_sous_plafond || 2.5;

    ifc += `#${entityId}=IFCSPACE('space_${surface.id}',#2,'${surface.room_name}','${surface.room_type || "Room"}',$,#14,$,$,.ELEMENT.,.INTERNAL.,$);
`;
    entityId++;
  });

  // Add walls, doors, windows from objects
  objects.forEach((obj, index) => {
    const objType = obj.object_type?.toLowerCase() || "element";
    const width = obj.width || 1;
    const height = obj.height || 2.5;
    const depth = obj.depth || 0.2;

    if (objType.includes("wall") || objType.includes("mur")) {
      ifc += `#${entityId}=IFCWALL('wall_${obj.id}',#2,'${obj.object_name || "Wall"}',$,$,#14,$,$,$);
`;
    } else if (objType.includes("door") || objType.includes("porte")) {
      ifc += `#${entityId}=IFCDOOR('door_${obj.id}',#2,'${obj.object_name || "Door"}',$,$,#14,$,$,${height},${width},$,$);
`;
    } else if (objType.includes("window") || objType.includes("fenetre") || objType.includes("fenêtre")) {
      ifc += `#${entityId}=IFCWINDOW('window_${obj.id}',#2,'${obj.object_name || "Window"}',$,$,#14,$,$,${height},${width},$,$);
`;
    } else {
      ifc += `#${entityId}=IFCBUILDINGELEMENTPROXY('elem_${obj.id}',#2,'${obj.object_name || objType}',$,$,#14,$,$,$);
`;
    }
    entityId++;
  });

  ifc += `ENDSEC;
END-ISO-10303-21;`;

  return ifc;
}

function generateGLTF(model: any, surfaces: any[], objects: any[], options: any): string {
  const gltf = {
    asset: {
      version: "2.0",
      generator: "MyEDLs BIM Generator",
      copyright: "MyHome SAS"
    },
    scene: 0,
    scenes: [{
      name: "BIM Model",
      nodes: [] as number[]
    }],
    nodes: [] as any[],
    meshes: [] as any[],
    accessors: [] as any[],
    bufferViews: [] as any[],
    buffers: [] as any[],
    materials: [] as any[]
  };

  // Add basic materials
  const materials = [
    { name: "Wall", color: [0.9, 0.9, 0.9, 1] },
    { name: "Floor", color: [0.6, 0.5, 0.4, 1] },
    { name: "Window", color: [0.7, 0.85, 0.95, 0.5] },
    { name: "Door", color: [0.5, 0.35, 0.2, 1] },
  ];

  materials.forEach((mat, index) => {
    gltf.materials.push({
      name: mat.name,
      pbrMetallicRoughness: {
        baseColorFactor: mat.color,
        metallicFactor: 0,
        roughnessFactor: 0.8
      }
    });
  });

  // Add nodes for rooms
  let nodeIndex = 0;
  let xOffset = 0;

  surfaces.forEach((surface, index) => {
    const length = Math.sqrt(surface.surface_m2 || 20);
    const width = length;
    const height = surface.hauteur_sous_plafond || 2.5;

    gltf.nodes.push({
      name: surface.room_name || `Room ${index + 1}`,
      translation: [xOffset, 0, 0],
      extras: {
        type: "room",
        surface_m2: surface.surface_m2,
        volume_m3: surface.volume_m3,
        room_type: surface.room_type
      }
    });

    gltf.scenes[0].nodes.push(nodeIndex);
    nodeIndex++;
    xOffset += length + 0.5;
  });

  // Add nodes for objects
  objects.forEach((obj, index) => {
    const geometry = obj.geometry || {};
    const position = geometry.position || { x: 0, y: 0, z: 0 };

    gltf.nodes.push({
      name: obj.object_name || obj.object_type || `Object ${index + 1}`,
      translation: [position.x || 0, position.y || 0, position.z || 0],
      extras: {
        type: obj.object_type,
        material: obj.material_type,
        condition: obj.condition_state,
        anomalies: obj.anomalies
      }
    });

    gltf.scenes[0].nodes.push(nodeIndex);
    nodeIndex++;
  });

  return JSON.stringify(gltf, null, 2);
}

function generateOBJ(model: any, surfaces: any[], objects: any[], options: any): string {
  let obj = `# MyEDLs BIM Export
# Model ID: ${model.id}
# Generated: ${new Date().toISOString()}

mtllib bim_materials.mtl

`;

  let vertexIndex = 1;
  let xOffset = 0;

  // Generate room geometry (simple boxes)
  surfaces.forEach((surface, index) => {
    const length = Math.sqrt(surface.surface_m2 || 20);
    const width = length;
    const height = surface.hauteur_sous_plafond || 2.5;

    obj += `# Room: ${surface.room_name || `Room ${index + 1}`}
o ${surface.room_name?.replace(/\s+/g, '_') || `Room_${index + 1}`}
`;

    // Box vertices
    const x = xOffset;
    const y = 0;
    const z = 0;

    // Floor vertices
    obj += `v ${x} ${y} ${z}
v ${x + length} ${y} ${z}
v ${x + length} ${y} ${z + width}
v ${x} ${y} ${z + width}
`;

    // Ceiling vertices
    obj += `v ${x} ${y + height} ${z}
v ${x + length} ${y + height} ${z}
v ${x + length} ${y + height} ${z + width}
v ${x} ${y + height} ${z + width}
`;

    // Faces
    const v = vertexIndex;
    obj += `usemtl Floor
f ${v} ${v + 1} ${v + 2} ${v + 3}
usemtl Ceiling
f ${v + 4} ${v + 7} ${v + 6} ${v + 5}
usemtl Wall
f ${v} ${v + 4} ${v + 5} ${v + 1}
f ${v + 1} ${v + 5} ${v + 6} ${v + 2}
f ${v + 2} ${v + 6} ${v + 7} ${v + 3}
f ${v + 3} ${v + 7} ${v + 4} ${v}

`;

    vertexIndex += 8;
    xOffset += length + 1;
  });

  return obj;
}

function generateUSDA(model: any, surfaces: any[], objects: any[], options: any): string {
  let usda = `#usda 1.0
(
    defaultPrim = "BIMModel"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "BIMModel" (
    kind = "component"
)
{
`;

  let xOffset = 0;

  surfaces.forEach((surface, index) => {
    const length = Math.sqrt(surface.surface_m2 || 20);
    const width = length;
    const height = surface.hauteur_sous_plafond || 2.5;
    const name = (surface.room_name || `Room_${index + 1}`).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

    usda += `    def Xform "${name}"
    {
        double3 xformOp:translate = (${xOffset}, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]
        
        def Cube "Floor"
        {
            double3 xformOp:scale = (${length}, 0.1, ${width})
            double3 xformOp:translate = (${length / 2}, 0, ${width / 2})
            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:scale"]
        }
        
        def Cube "Ceiling"
        {
            double3 xformOp:scale = (${length}, 0.1, ${width})
            double3 xformOp:translate = (${length / 2}, ${height}, ${width / 2})
            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:scale"]
        }
    }
`;

    xOffset += length + 1;
  });

  usda += `}
`;

  return usda;
}
