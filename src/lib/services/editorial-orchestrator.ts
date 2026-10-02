import { ContentRepository } from "@/server/repositories";
import { ProductEvidenceMap, ProductType } from "@/lib/types/editorial-intelligence";
import { EditorialAudienceProfile, EditorialDecision, EditorialHypothesis, EditorialOrchestratorInput } from "@/lib/types/editorial-orchestrator";
import { EditorialThesis, SectionOutlineItem } from "@/lib/schema";

function norm(v: string): string { return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " "); }
function tokenSet(v: string): Set<string> { return new Set(norm(v).split(/\s+/).filter(t => t.length >= 4)); }
function similarity(a: string, b: string): number { const x=tokenSet(a), y=tokenSet(b); if(!x.size || !y.size) return 0; let i=0; for(const t of x) if(y.has(t)) i++; return i/(x.size+y.size-i); }
function audience(id:string, role:string, label:string, why:string, pain:string[], criteria:string[], questions:string[], objections:string[]): EditorialAudienceProfile { return {id,role,label,whyThisAudience:why,painPoints:pain,buyingCriteria:criteria,technicalQuestions:questions,objections}; }

function audienceStrategy(type: ProductType): EditorialAudienceProfile[] {
  const q=['¿Qué decisión técnica evita un cuello de botella?','¿Qué evidencia permite validar esa decisión?'];
  const o=['La especificación nominal no garantiza el resultado del despliegue.'];
  if(type==='ACCESS_POINT') return [
    audience('network-engineer','Ingeniero de redes','Ingeniero de redes Wi-Fi','Diseña RF, capacidad y backhaul.',['densidad','uplink','RF','PoE'],['capacidad','uplink','estándares','gestión'],['¿Dónde aparece el cuello de botella?','¿Cómo cambia el diseño con alta densidad?'],o),
    audience('wifi-installer','Instalador Wi-Fi','Instalador de infraestructura Wi-Fi','Convierte el diseño en una instalación reproducible.',['montaje','PoE','cableado','puesta en marcha'],['tiempo','alimentación','aprovisionamiento'],['¿Qué revisar antes de fijar el AP?','¿Qué errores provocan una segunda visita?'],o),
    audience('it-director','Director TIC','Director TIC / Sistemas','Decide arquitectura, operación y ciclo de vida.',['continuidad','gestión','seguridad'],['operación','escalabilidad','seguridad'],['¿Qué cambia operacionalmente?','¿Qué dependencia introduce?'],o),
    audience('campus-owner','Responsable de campus','Responsable de infraestructura de campus','Gestiona densidad y movilidad en zonas heterogéneas.',['densidad','cobertura','movilidad'],['capacidad por zona','roaming','mantenimiento'],['¿Cómo dimensionar zonas de alta demanda?','¿Qué debe validarse in situ?'],o)
  ];
  if(type==='SWITCH') return [
    audience('network-architect','Arquitecto de redes','Arquitecto de redes','Define topología, uplinks y segmentación.',['oversubscription','uplinks','VLAN','PoE'],['switching','uplinks','PoE','L2/L3'],['¿Dónde está el cuello de botella?','¿Cómo dimensionar uplinks y PoE?'],o),
    audience('infra-engineer','Ingeniero de infraestructura','Ingeniero de infraestructura','Convierte las especificaciones en una topología mantenible.',['rack','cableado','temperatura','PoE'],['densidad','gestión','diagnóstico'],['¿Qué simplifica la instalación?','¿Qué métricas vigilar?'],o),
    audience('it-director','Director TIC','Director TIC / Sistemas','Gestiona continuidad y operación multisede.',['continuidad','gestión','ciclo de vida'],['operación','seguridad','estandarización'],['¿Qué impacto tiene en operación?','¿Qué riesgo introduce?'],o),
    audience('installer','Instalador','Instalador de redes','Despliega, alimenta y valida físicamente la electrónica.',['montaje','PoE','patching'],['facilidad','diagnóstico','alimentación'],['¿Qué errores de obra son frecuentes?','¿Qué validar antes de entregar?'],o)
  ];
  if(type==='DAC' || type==='OPTICAL_TRANSCEIVER' || type==='FIBER_CABLE') return [
    audience('datacenter-engineer','Ingeniero de CPD','Ingeniero de CPD','Decide medio físico, densidad y mantenimiento del rack.',['densidad','temperatura','compatibilidad'],['distancia','compatibilidad','disipación'],['¿Cuándo conviene cobre o fibra?','¿Qué compatibilidad debe comprobarse?'],o),
    audience('network-architect','Arquitecto de redes','Arquitecto de redes','Decide el medio según distancia y topología.',['medio físico','distancia','uplinks'],['alcance','estándar','evolución'],['¿Qué medio encaja con cada distancia?','¿Qué condiciona la evolución?'],o),
    audience('installer','Instalador','Instalador de cableado','Ejecuta físicamente la conectividad.',['longitud','limpieza','patching'],['facilidad','robustez','mantenimiento'],['¿Qué errores generan retrabajos?','¿Qué revisar antes de cerrar el rack?'],o),
    audience('procurement','Compras','Responsable de Compras / TCO','Controla compatibilidad, inventario y estandarización.',['SKUs','compatibilidad','stock'],['interoperabilidad','disponibilidad','homogeneidad'],['¿Qué criterio reduce referencias?','¿Qué riesgo de incompatibilidad existe?'],o)
  ];
  if(type==='ROUTER' || type==='FIREWALL') return [
    audience('network-architect','Arquitecto de redes','Arquitecto de redes','Diseña WAN, routing, VPN y continuidad.',['failover','VPN','WAN'],['throughput','redundancia','VPN'],['¿Qué ocurre cuando falla el ISP?','¿Qué capacidad VPN requiere la sede?'],o),
    audience('security-manager','Seguridad','Responsable de seguridad','Evalúa política, segmentación y operación.',['segmentación','VPN','políticas'],['controles','auditoría','gestión'],['¿Qué controles son verificables?','¿Qué dependencia operacional existe?'],o),
    audience('branch-operations','Operaciones','Responsable de operaciones multisede','Minimiza intervención local en sedes remotas.',['caídas WAN','soporte remoto'],['failover','gestión remota'],['¿Cómo se recupera una sede?','¿Qué tareas se centralizan?'],o)
  ];
  return [
    audience('installer','Instalador','Instalador / Técnico','Convierte la especificación en una instalación verificable.',['montaje','compatibilidad'],['facilidad','fiabilidad'],q,o),
    audience('network-engineer','Ingeniero de redes','Ingeniero de redes','Evalúa el componente dentro de la arquitectura.',['interoperabilidad','capacidad'],['estándares','compatibilidad'],q,o),
    audience('it-director','Director TIC','Director TIC / Sistemas','Traduce el componente a impacto operacional.',['continuidad','operación'],['riesgo','ciclo de vida'],q,o),
    audience('procurement','Compras','Responsable de Compras / TCO','Evita compras incompatibles y referencias innecesarias.',['compatibilidad','inventario'],['disponibilidad','interoperabilidad'],q,o)
  ];
}

const questions: Record<ProductType,string[]> = {
ACCESS_POINT:['¿Cuándo un uplink limitado invalida parte de la capacidad del AP?','¿Qué cambia al aumentar la densidad de clientes?','¿Cómo comprobar el presupuesto PoE antes de instalar?','¿Qué exige cambiar la red cableada al migrar a Wi-Fi 7?','¿Cómo distinguir cobertura de capacidad?','¿Cuándo MLO cambia la arquitectura?','¿Cómo diseñar el backhaul para evitar estrangulamiento?','¿Qué errores de instalación parecen problemas RF?','¿Cómo dimensionar APs para zonas de alta demanda?','¿Qué validar antes de estandarizar el modelo?'],
SWITCH:['¿Cómo dimensionar PoE y uplinks como una sola decisión?','¿Dónde aparece la oversubscription?','¿Cuándo 2.5G cambia la topología?','¿Qué debe revisar el instalador antes de cerrar el rack?','¿Cómo repartir el presupuesto PoE?','¿Cuándo reservar uplinks 10G desde el diseño?','¿Qué papel juega L2/L3 en la segmentación?','¿Cómo detectar un cuello de botella fuera de los puertos?','¿Qué reduce retrabajo en despliegues multisede?','¿Cómo usar la telemetría para operar la red?'],
DAC:['¿Cuándo tiene sentido DAC frente a óptica en distancias cortas?','¿Cómo seleccionar la longitud correcta?','¿Qué compatibilidad debe verificarse antes de conectar?','¿Cómo influye la densidad del rack en el medio físico?','¿Qué cambia térmicamente entre DAC y óptica?','¿Cuándo NO debe utilizarse DAC?','¿Cómo estandarizar enlaces cortos sin multiplicar SKUs?','¿Qué errores generan incidencias intermitentes?','¿Qué criterio debe prevalecer: distancia, densidad o compatibilidad?','¿Cómo encaja DAC en una evolución a 10G?'],
OPTICAL_TRANSCEIVER:['¿Cómo elegir óptica según distancia y fibra?','¿Qué compatibilidad debe comprobarse antes de comprar?','¿Cuándo monomodo y multimodo responden a necesidades distintas?','¿Cómo evitar errores de presupuesto óptico?','¿Qué papel juega la limpieza de conectores?','¿Cómo estandarizar ópticas sin bloquear ampliaciones?','¿Qué diferencia alcance de arquitectura?','¿Cuándo una óptica de mayor alcance no aporta valor?','¿Cómo documentar transceptores para reducir incidencias?','¿Qué decisiones de inventario reducen incompatibilidades?'],
FIBER_CABLE:['¿Cómo elegir fibra según distancia y arquitectura?','¿Qué errores físicos provocan pérdidas?','¿Cómo dimensionar el presupuesto óptico?','¿Cuándo monomodo y multimodo cambian la decisión?','¿Qué instalación física debe validarse?','¿Cómo reducir retrabajos en racks de alta densidad?','¿Qué documentación debe acompañar una tirada?','¿Cuándo una solución de cobre es más adecuada?','¿Cómo estandarizar conectividad óptica entre sedes?','¿Qué comprobar antes de certificar?'],
ROUTER:['¿Cómo diseñar failover WAN sin falsa sensación de continuidad?','¿Qué throughput VPN necesita realmente una sede?','¿Cómo separar capacidad de routing y cifrado?','¿Qué reduce intervención local en sedes remotas?','¿Cómo dimensionar doble WAN para tráfico crítico?','¿Qué papel juega la gestión centralizada?','¿Cómo migrar sin cambiar toda la LAN?','¿Qué métricas observar tras activar failover?','¿Cuándo la redundancia complica la arquitectura?','¿Cómo convertir el gateway en pieza operativa?'],
FIREWALL:['¿Qué capacidad de firewall importa realmente en B2B?','¿Cómo separar throughput de inspección y VPN?','¿Qué arquitectura de segmentación evita errores?','¿Cómo diseñar políticas sin multiplicar excepciones?','¿Qué comprobar antes de sustituir un firewall?','¿Cómo evaluar dependencia de gestión y licencias?','¿Qué métricas indican saturación?','¿Cómo diseñar continuidad si falla el enlace principal?','¿Qué tareas deben poder hacerse remotamente?','¿Cómo documentar una migración con bajo riesgo?'],
CAMERA:['¿Cómo dimensionar ancho de banda para videovigilancia?','¿Qué papel juega PoE en cámaras avanzadas?','¿Cómo relacionar cobertura y almacenamiento?','¿Qué errores de red parecen fallos de cámara?','¿Cómo segmentar cámaras sin complicar la operación?','¿Qué criterios usar para ubicación e iluminación?','¿Cómo calcular el impacto sobre el uplink?','¿Cuándo una cámara requiere otra arquitectura?','¿Cómo preparar mantenimiento sin perder cobertura?','¿Qué valida un integrador antes de entregar?'],
UPS:['¿Cómo relacionar carga real y autonomía?','¿Qué equipos deben tener prioridad durante un corte?','¿Cómo evitar que la autonomía teórica oculte una limitación?','¿Qué mantenimiento debe formar parte del diseño?','¿Cómo coordinar UPS y protección eléctrica?','¿Qué señales indican envejecimiento de baterías?','¿Cómo diseñar continuidad para equipos PoE?','¿Qué cargas no deberían compartir UPS?','¿Cómo documentar autonomía para operación?','¿Cuándo una UPS pequeña es suficiente?'],
RACK:['¿Cómo dimensionar densidad sin comprometer mantenimiento?','¿Qué organización reduce errores de patching?','¿Cómo relacionar ventilación y densidad?','¿Qué espacio reservar para crecimiento?','¿Cómo evitar que el rack sea un cuello de botella físico?','¿Qué criterios estandarizan armarios entre sedes?','¿Cómo documentar posiciones y cableado?','¿Qué errores de montaje generan temperatura?','¿Cómo integrar alimentación y conectividad?','¿Qué validar antes de cerrar el rack?'],
ANTENNA:['¿Cómo elegir antena según cobertura y entorno?','¿Qué cambia con ganancia y patrón de radiación?','¿Cómo evitar errores de orientación?','¿Qué papel juega el cableado RF en la pérdida?','¿Cómo validar cobertura sin confundir potencia y calidad?','¿Cuándo una antena direccional cambia la arquitectura?','¿Qué riesgos introduce una instalación exterior?','¿Cómo documentar orientación para mantenimiento?','¿Qué compatibilidad física y RF verificar?','¿Cómo diseñar cobertura para alta densidad?'],
POWER_SUPPLY:['¿Cómo verificar compatibilidad eléctrica antes de sustituir una fuente?','¿Qué margen de potencia reservar?','¿Cómo detectar una fuente insuficiente antes de reinicios?','¿Qué papel juega temperatura en vida útil?','¿Cómo estandarizar fuentes sin mezclar tensiones?','¿Qué documentación acompaña una sustitución?','¿Cuándo una fuente genérica introduce riesgo?','¿Cómo dimensionar redundancia?','¿Qué errores de mantenimiento son más costosos?','¿Cómo validar una fuente en campo?'],
ACCESSORY:['¿Qué problema de instalación resuelve realmente este accesorio?','¿Qué compatibilidad debe comprobarse?','¿Cómo evitar que un accesorio incompatible bloquee el despliegue?','¿Qué criterio permite elegir entre accesorios equivalentes?','¿Cómo reducir referencias y errores de inventario?','¿Qué impacto tiene en tiempo de instalación?','¿Qué limitación debe conocer el técnico?','¿Cómo documentar su uso dentro de la arquitectura?','¿Cuándo aporta valor y cuándo añade complejidad?','¿Qué validar antes de comprar?']
};

function makeHypotheses(type: ProductType, sku: string, model: string, audience: EditorialAudienceProfile, evidence: ProductEvidenceMap): EditorialHypothesis[] {
  const qs = questions[type] || questions.ACCESSORY;
  const offset = audience.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % qs.length;
  return qs.map((_,index)=>({
    id: type.toLowerCase()+"-hyp-"+(index+1),
    editorialQuestion: qs[(index + offset) % qs.length],
    problem: "Resolver esta decisión solo desde la ficha técnica puede provocar retrabajo, sobrecoste o un cuello de botella.",
    tension: index%3===0 ? "capacidad nominal vs capacidad realmente utilizable" : index%3===1 ? "simplicidad inicial vs mantenibilidad" : "coste de adquisición vs riesgo técnico",
    readerPromise: "El lector podrá convertir una especificación verificable de "+model+" en un criterio de decisión aplicable.",
    targetAudience: audience.label, buyerStage: "evaluación", technicalDepth: "alta",
    productRole: model+" aporta evidencia para resolver la decisión; no es el protagonista publicitario permanente.",
    noveltyReason: "Pregunta editorial específica del tipo de producto; evita las plantillas universales. Evidencia: "+(evidence.verifiedFacts[0]||sku)
  }));
}

function makeAngles(h: EditorialHypothesis[], preferred?: string): EditorialDecision['angles'] {
  return h.slice(0,12).map((x,i)=>({ id:"angle-"+x.id, title:x.editorialQuestion.replace(/^¿|\?$/g,""), editorialQuestion:x.editorialQuestion, tension:x.tension, readerPromise:x.readerPromise, rationale:x.noveltyReason, relevanceScore: preferred && norm(x.targetAudience).includes(norm(preferred)) ? 100-i : 90-i, targetAudience:x.targetAudience }));
}

function thesis(angle: EditorialDecision['selectedAngle'], intel: EditorialOrchestratorInput['intel'], audience: EditorialAudienceProfile, evidence: ProductEvidenceMap): EditorialThesis {
  return {
    problem:"El profesional necesita resolver "+angle.editorialQuestion.replace(/^¿|\\?$/g,"")+" con evidencia verificable.",
    targetProfessional:audience.label,
    businessContext:"El SKU "+intel.sku+" debe evaluarse dentro de una arquitectura B2B real. "+(evidence.verifiedFacts[0]||"Product Truth verificada."),
    technicalQuestion:angle.editorialQuestion, whyItMatters:angle.tension, centralArgument:angle.readerPromise,
    solutionApproach:"Aplicar un criterio de diseño basado en Product Truth, limitaciones conocidas y contexto de "+audience.label+".",
    productRole:intel.model+" es el elemento técnico de la decisión, no una ficha publicitaria."
  };
}

function outline(angle: EditorialDecision['selectedAngle'], audience: EditorialAudienceProfile, model:string): SectionOutlineItem[] {
  return [
    {section:"La decisión que hay que resolver",purpose:"Plantear la pregunta profesional",argument:angle.editorialQuestion},
    {section:"Qué cambia técnicamente",purpose:"Explicar el mecanismo",argument:angle.tension},
    {section:"Cómo evaluar el escenario para "+audience.label,purpose:"Traducir especificaciones a criterios operativos",argument:"Aplicar los criterios al contexto profesional."},
    {section:"Qué aporta "+model,purpose:"Relacionar el producto con la decisión",argument:angle.readerPromise},
    {section:"Criterios de validación antes del despliegue",purpose:"Convertir el aprendizaje en una lista aplicable",argument:"Comprobar evidencia, compatibilidad y limitaciones."},
    {section:"Decisión profesional",purpose:"Cerrar con un criterio accionable",argument:"Indicar cuándo encaja y qué debe verificarse."}
  ];
}

export class EditorialOrchestrator {
  async generate(input: EditorialOrchestratorInput): Promise<EditorialDecision> {
    const sku=input.sku.trim().toUpperCase();
    if(!sku || input.intel.sku.toUpperCase()!==sku) throw new Error("EDITORIAL_SKU_LOCK_FAILED: "+sku+" != "+input.intel.sku);
    const audiences=audienceStrategy(input.productType);
    const primary=input.preferredAudience ? (audiences.find(a=>norm(a.label).includes(norm(input.preferredAudience||"")))||audiences[0]) : audiences[0];
    const secondary=audiences.find(a=>a.id!==primary.id)||primary;
    const hypotheses=makeHypotheses(input.productType,sku,input.intel.model,primary,input.evidenceMap);
    const angles=makeAngles(hypotheses,input.preferredAudience);
    const recent=input.workspaceId ? await new ContentRepository().listRecent(100,input.workspaceId) : [];
    const used=recent.map(item=>{ const body=(item.canonicalBody&&typeof item.canonicalBody==='object')?item.canonicalBody as Record<string,unknown>:{}; const t=(body.editorialThesis&&typeof body.editorialThesis==='object')?body.editorialThesis as Record<string,unknown>:{}; const b=(body.blog&&typeof body.blog==='object')?body.blog as Record<string,unknown>:{}; return {title:typeof b.title==='string'?b.title:"",question:typeof t.technicalQuestion==='string'?t.technicalQuestion:"",audience:typeof t.targetProfessional==='string'?t.targetProfessional:""}; });
    const rejected:string[]=[]; const reasons:string[]=[]; let selected=angles[0]; let selectedFound=false;
    const requested = input.requestedAngle;
    const ordered = requested
      ? [...angles.filter(a => a.id === requested.id || a.title === requested.title), ...angles.filter(a => a.id !== requested.id && a.title !== requested.title)]
      : angles;
    for(const angle of ordered){ const collision=used.find(old=>similarity(angle.title,old.title)>=0.72 || similarity(angle.editorialQuestion,old.question)>=0.58); if(!collision){selected=angle; selectedFound=true; break;} rejected.push(angle.id); reasons.push("Colisión con "+(collision?.title||collision?.question)); }
    if(!selectedFound && ordered.length>0) selected=ordered[ordered.length-1];
    const selectedAudience=audiences.find(a=>a.label===selected.targetAudience)||primary;
    const th=thesis(selected,input.intel,selectedAudience,input.evidenceMap);
    const learnings=[selected.editorialQuestion,"Cómo interpretar la tensión: "+selected.tension+".","Qué evidencia de "+sku+" debe verificarse.","Qué limitación debe comprobar "+selectedAudience.label+".","Cuándo encaja el producto y cuándo conviene otra arquitectura."];
    return {sku,productType:input.productType,primaryAudience:primary.label,secondaryAudience:secondary.label,recommendedAudiences:audiences,editorialQuestions:hypotheses.map(h=>h.editorialQuestion),hypotheses,angles,selectedAngle:selected,thesis:th,readerLearnings:learnings,outline:outline(selected,selectedAudience,input.intel.model),diversityReport:{comparedCount:used.length,collisionDetected:!selectedFound,collisionReasons:reasons,rejectedAngleIds:rejected},productTruthLock:{sku,model:input.intel.model,brand:input.intel.brand}};
  }
}
export { audienceStrategy, makeHypotheses };