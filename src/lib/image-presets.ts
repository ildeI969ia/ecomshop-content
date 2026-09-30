export interface PresetImagePrompt {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
}

export const PRESET_IMAGE_PROMPTS: PresetImagePrompt[] = [
  {
    id: "wifi7-enterprise-office",
    title: "AP Wi-Fi 7 en Oficina Enterprise",
    prompt: "EnGenius Wi-Fi 7 Enterprise Access Point mounted on ceiling of a modern open-plan corporate headquarters, subtle LED status indicator, elegant architectural lighting, open workspace background, photorealistic 8k.",
    aspectRatio: "16:9"
  },
  {
    id: "rack-42u-switches",
    title: "Rack 42U Cableado con Switches PoE+",
    prompt: "Enterprise datacenter server rack 42U filled with EnGenius PoE+ switches, organized Cat6A patch cables, glowing blue LED activity lights, clean cable management, photorealistic 8k.",
    aspectRatio: "16:9"
  },
  {
    id: "outdoor-ip67-environment",
    title: "AP Outdoor IP67 en Entorno Exterior",
    prompt: "EnGenius IP67 weather-resistant outdoor wireless access point mounted on industrial pole in harsh outdoor environment with water droplets, ruggedized casing, heavy duty telecommunications hardware, photorealistic 8k.",
    aspectRatio: "1:1"
  },
  {
    id: "network-topology",
    title: "Topología 3D & Cloud Management",
    prompt: "Isometric 3D technological visualization of enterprise hybrid networking topology: cloud controller connecting to PoE switches, WiFi 7 APs and multi-gigabit gateways, clean glowing cybernetic lines, deep slate background.",
    aspectRatio: "16:9"
  }
];
