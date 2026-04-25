
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Lock, RefreshCw, Upload, UserPlus, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { BACKEND_API } from '../../config/api';
import { useToast } from '../../components/ui/Toast';
import { comfyService } from '../../services/comfyService';

type StepId = 'start' | 'expression' | 'character-v3' | 'automask' | 'multi-angle' | 'review';
type EntryMode = '' | 'upload' | 'create';

type LoRASlot = { name: string; weight: number };

type ExpressionParams = {
  blink: number;
  eyebrow: number;
  wink: number;
  pupil_x: number;
  pupil_y: number;
  aaa: number;
  eee: number;
  woo: number;
  smile: number;
  rotate_pitch: number;
  rotate_yaw: number;
  rotate_roll: number;
};

type MultiAngleState = {
  horizontal_angle: number;
  vertical_angle: number;
  zoom: number;
  default_prompts: boolean;
  camera_view: boolean;
  output_count: number;
};

type CharacterProfile = {
  gender: string;
  age_range: string;
  hair_style: string;
  hair_color: string;
  eye_color: string;
  skin_tone: string;
  height: string;
  body_type: string;
  chest_size: string;
  fashion_style: string;
  makeup_style: string;
  freckles: boolean;
  tattoos: boolean;
  glasses: boolean;
  custom_notes: string;
  vibe_tags: string[];
};

type PresetRecord = {
  id: string;
  name: string;
  profile: CharacterProfile;
  lora_slots: LoRASlot[];
  created_at: number;
};

type CandidateImage = {
  viewUrl: string;
  inputFilename: string;
};

type InfluencerJobState = {
  entry_mode: EntryMode;
  base_image_ref: string;
  base_preview_url: string;
  hero_image_ref: string;
  character_lock_text: string;
  character_locked: boolean;
  seed_policy: 'random' | 'fixed';
  fixed_seed: number;
  output_format: 'png' | 'jpg';
  lora_slots: LoRASlot[];
  profile: CharacterProfile;
  profile_advanced: boolean;
  candidate_images: CandidateImage[];
  my_influencer_presets: PresetRecord[];
  upload_identity_notes: string;
  expression_params: ExpressionParams;
  expression_preset: string;
  expression_results: string[];
  characterv3_refs: string[];
  characterv3_results: string[];
  mask_query: string;
  replacement_prompt: string;
  automask_results: string[];
  multi_angle: MultiAngleState;
  multi_angle_results: string[];
};

type GenerateImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

const STORAGE_KEY = 'influencer_job_state_v2';
const PRESET_STORAGE_KEY = 'influencer_presets_v1';

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'start', label: 'Start' },
  { id: 'expression', label: 'Expression' },
  { id: 'character-v3', label: 'Character v3' },
  { id: 'automask', label: 'AutoMask' },
  { id: 'multi-angle', label: 'Multi-Angle' },
  { id: 'review', label: 'Review' },
];

const DEFAULT_PROFILE: CharacterProfile = {
  gender: 'woman',
  age_range: 'adult-25-34',
  hair_style: 'long-wavy',
  hair_color: 'brown',
  eye_color: 'brown',
  skin_tone: 'light',
  height: 'average',
  body_type: 'slim',
  chest_size: 'medium',
  fashion_style: 'minimal',
  makeup_style: 'natural',
  freckles: false,
  tattoos: false,
  glasses: false,
  custom_notes: '',
  vibe_tags: ['photorealistic', 'clean-lighting'],
};

const PROFILE_PRESETS: Record<string, Partial<CharacterProfile>> = {
  none: {},
  editorial: {
    gender: 'woman', age_range: 'adult-25-34', hair_style: 'slick-back', hair_color: 'dark-blonde', eye_color: 'green',
    skin_tone: 'light', height: 'tall', body_type: 'slim-athletic', chest_size: 'medium', fashion_style: 'editorial',
    makeup_style: 'soft-glam', vibe_tags: ['editorial', 'high-detail', 'cinematic'],
  },
  street: {
    gender: 'woman', age_range: 'adult-18-24', hair_style: 'ponytail', hair_color: 'brown', eye_color: 'hazel',
    skin_tone: 'olive', height: 'average', body_type: 'athletic', chest_size: 'small-medium', fashion_style: 'streetwear',
    makeup_style: 'natural', vibe_tags: ['urban', 'candid', 'instagram-style'],
  },
  beauty: {
    gender: 'woman', age_range: 'adult-25-34', hair_style: 'straight-medium', hair_color: 'black', eye_color: 'hazel',
    skin_tone: 'fair', height: 'average', body_type: 'slim', chest_size: 'medium', fashion_style: 'minimal',
    makeup_style: 'beauty-closeup', freckles: true, vibe_tags: ['studio-backdrop', 'sharp-focus', 'natural-skin'],
  },
};

const VIBE_OPTIONS = ['photorealistic', 'high-detail', 'cinematic', 'soft-light', 'dramatic-light', 'editorial', 'natural-skin', 'sharp-focus', 'instagram-style', 'studio-backdrop'];

const DEFAULT_EXPRESSION: ExpressionParams = {
  blink: 0,
  eyebrow: 0,
  wink: 0,
  pupil_x: 0,
  pupil_y: 0,
  aaa: 0,
  eee: 0,
  woo: 0,
  smile: 0,
  rotate_pitch: 0,
  rotate_yaw: 0,
  rotate_roll: 0,
};

const EXPRESSION_PRESETS: Array<{ id: string; label: string; values: Partial<ExpressionParams> }> = [
  { id: 'neutral', label: 'Neutral', values: { smile: 0, wink: 0, eyebrow: 0 } },
  { id: 'smile', label: 'Smile', values: { smile: 0.75, eyebrow: 0.2 } },
  { id: 'wink', label: 'Wink', values: { wink: 1, smile: 0.35 } },
  { id: 'surprise', label: 'Surprise', values: { eyebrow: 0.8, aaa: 0.7 } },
  { id: 'angry', label: 'Angry', values: { eyebrow: -0.7, smile: -0.35 } },
];

const DEFAULT_JOB_STATE: InfluencerJobState = {
  entry_mode: '',
  base_image_ref: '',
  base_preview_url: '',
  hero_image_ref: '',
  character_lock_text: '',
  character_locked: false,
  seed_policy: 'random',
  fixed_seed: -1,
  output_format: 'png',
  lora_slots: [
    { name: '', weight: 1 },
    { name: '', weight: 1 },
    { name: '', weight: 1 },
  ],
  profile: { ...DEFAULT_PROFILE },
  profile_advanced: false,
  candidate_images: [],
  my_influencer_presets: [],
  upload_identity_notes: '',
  expression_params: { ...DEFAULT_EXPRESSION },
  expression_preset: 'neutral',
  expression_results: [],
  characterv3_refs: [],
  characterv3_results: [],
  mask_query: 'face',
  replacement_prompt: '',
  automask_results: [],
  multi_angle: {
    horizontal_angle: 0,
    vertical_angle: 0,
    zoom: 5,
    default_prompts: false,
    camera_view: false,
    output_count: 4,
  },
  multi_angle_results: [],
};

function parseStoredState(raw: string | null): InfluencerJobState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<InfluencerJobState>;
    return {
      ...DEFAULT_JOB_STATE,
      ...parsed,
      lora_slots: Array.isArray(parsed.lora_slots) && parsed.lora_slots.length === 3
        ? parsed.lora_slots.map((slot) => ({ name: String(slot?.name ?? ''), weight: Number(slot?.weight ?? 1) }))
        : DEFAULT_JOB_STATE.lora_slots,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      candidate_images: Array.isArray(parsed.candidate_images) ? parsed.candidate_images : [],
      my_influencer_presets: Array.isArray(parsed.my_influencer_presets) ? parsed.my_influencer_presets : [],
      expression_params: { ...DEFAULT_EXPRESSION, ...(parsed.expression_params ?? {}) },
      expression_results: Array.isArray(parsed.expression_results) ? parsed.expression_results : [],
      characterv3_refs: Array.isArray(parsed.characterv3_refs) ? parsed.characterv3_refs : [],
      characterv3_results: Array.isArray(parsed.characterv3_results) ? parsed.characterv3_results : [],
      automask_results: Array.isArray(parsed.automask_results) ? parsed.automask_results : [],
      multi_angle: { ...DEFAULT_JOB_STATE.multi_angle, ...(parsed.multi_angle ?? {}) },
      multi_angle_results: Array.isArray(parsed.multi_angle_results) ? parsed.multi_angle_results : [],
    };
  } catch {
    return null;
  }
}

function readInitialState(): InfluencerJobState {
  if (typeof window === 'undefined') return DEFAULT_JOB_STATE;
  const parsed = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
  if (parsed) return parsed;
  const presetsRaw = window.localStorage.getItem(PRESET_STORAGE_KEY);
  let presets: PresetRecord[] = [];
  try {
    presets = presetsRaw ? JSON.parse(presetsRaw) as PresetRecord[] : [];
  } catch {
    presets = [];
  }
  return { ...DEFAULT_JOB_STATE, my_influencer_presets: presets };
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_000);
}

function normalizeHorizontalAngleForWorkflow(angle: number): number {
  let normalized = Number.isFinite(angle) ? Math.round(angle) : 0;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function toViewUrl(image: GenerateImage): string {
  return `/comfy/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder ?? '')}&type=${encodeURIComponent(image.type ?? 'output')}`;
}

function normalizeLoraPayload(slots: LoRASlot[]): Array<{ name: string; strength: number }> {
  return slots.filter((slot) => slot.name.trim()).map((slot) => ({ name: slot.name.trim(), strength: Number(slot.weight || 1) }));
}

function buildProfilePrompt(profile: CharacterProfile): string {
  const traits: string[] = [
    `${profile.gender} ${profile.age_range.replaceAll('-', ' ')}`,
    `${profile.height.replaceAll('-', ' ')} height`,
    `${profile.body_type.replaceAll('-', ' ')} body`,
    `${profile.chest_size.replaceAll('-', ' ')} chest`,
    `${profile.skin_tone} skin tone`,
    `${profile.hair_color} ${profile.hair_style.replaceAll('-', ' ')} hair`,
    `${profile.eye_color} eyes`,
    `${profile.makeup_style.replaceAll('-', ' ')} makeup`,
    `${profile.fashion_style.replaceAll('-', ' ')} styling`,
  ];
  if (profile.freckles) traits.push('freckles');
  if (profile.tattoos) traits.push('visible tattoos');
  if (profile.glasses) traits.push('wearing glasses');
  if (profile.vibe_tags.length > 0) traits.push(...profile.vibe_tags);
  if (profile.custom_notes.trim()) traits.push(profile.custom_notes.trim());
  return traits.join(', ');
}

function parseMaskTargets(maskQuery: string): Record<'mask_face' | 'mask_hair' | 'mask_body' | 'mask_clothes' | 'mask_accessories' | 'mask_background', boolean> {
  const query = maskQuery.toLowerCase();
  const has = (tokens: string[]) => tokens.some((token) => query.includes(token));
  const all = has(['all', 'everything', 'whole']);
  return {
    mask_face: all || has(['face', 'head', 'skin']),
    mask_hair: all || has(['hair', 'fringe', 'beard']),
    mask_body: all || has(['body', 'torso', 'arms', 'legs']),
    mask_clothes: all || has(['clothes', 'shirt', 'dress', 'jacket', 'outfit']),
    mask_accessories: all || has(['accessory', 'hat', 'glasses', 'necklace', 'jewelry']),
    mask_background: all || has(['background', 'bg', 'scene']),
  };
}

function combineCharacterPrompt(character: string, userPrompt: string): string {
  const c = character.trim();
  const p = userPrompt.trim();
  if (c && p) return `${c}, ${p}`;
  return c || p;
}

async function startGeneration(workflowId: string, params: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: workflowId, params }),
  });
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.prompt_id) throw new Error(data?.detail || data?.error || 'Failed to start generation');
  return String(data.prompt_id);
}

async function pollGeneration(promptId: string, timeoutMs = 240000): Promise<GenerateImage[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE_STATUS}/${encodeURIComponent(promptId)}`);
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.detail || data?.error || 'Status check failed');
    const status = String(data.status ?? '');
    if (status === 'completed') return Array.isArray(data.images) ? data.images as GenerateImage[] : [];
    if (status === 'pending' || status === 'running' || status === 'not_found') {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }
    throw new Error(`Unexpected status: ${status}`);
  }
  throw new Error('Generation timed out');
}

async function uploadFileToComfyInput(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BACKEND_API.BASE_URL}/api/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.filename) throw new Error(data?.detail || data?.error || 'Upload failed');
  return String(data.filename);
}
export const InfluencerPage = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<StepId>('start');
  const [job, setJob] = useState<InfluencerJobState>(readInitialState);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCandidates, setIsGeneratingCandidates] = useState(false);
  const [isGeneratingExpression, setIsGeneratingExpression] = useState(false);
  const [isGeneratingCharacterV3, setIsGeneratingCharacterV3] = useState(false);
  const [isGeneratingAutomask, setIsGeneratingAutomask] = useState(false);
  const [isGeneratingMultiAngle, setIsGeneratingMultiAngle] = useState(false);
  const [presetName, setPresetName] = useState('');

  const canRunDownstream = job.character_locked && !!job.base_image_ref && !!job.character_lock_text.trim();

  useEffect(() => {
    void comfyService.getLoras().then((items) => setAvailableLoras(items)).catch(() => setAvailableLoras([]));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(job.my_influencer_presets));
  }, [job]);

  const setJobPatch = (patch: Partial<InfluencerJobState>) => setJob((prev) => ({ ...prev, ...patch }));

  const updateLora = (index: number, patch: Partial<LoRASlot>) => {
    setJob((prev) => {
      const next = [...prev.lora_slots];
      next[index] = { ...next[index], ...patch };
      return { ...prev, lora_slots: next };
    });
  };

  const setProfileField = <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => {
    setJob((prev) => ({ ...prev, profile: { ...prev.profile, [key]: value } }));
  };

  const toggleVibe = (value: string) => {
    setJob((prev) => {
      const has = prev.profile.vibe_tags.includes(value);
      const next = has ? prev.profile.vibe_tags.filter((v) => v !== value) : [...prev.profile.vibe_tags, value];
      return { ...prev, profile: { ...prev.profile, vibe_tags: next } };
    });
  };

  const applyProfilePreset = (presetId: string) => {
    const preset = PROFILE_PRESETS[presetId] ?? {};
    setJob((prev) => ({ ...prev, profile: { ...prev.profile, ...preset } }));
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast('Name preset before saving', 'error');
      return;
    }
    const record: PresetRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      profile: { ...job.profile },
      lora_slots: job.lora_slots.map((slot) => ({ ...slot })),
      created_at: Date.now(),
    };
    setJob((prev) => ({ ...prev, my_influencer_presets: [record, ...prev.my_influencer_presets] }));
    setPresetName('');
    toast('Saved to My Influencers', 'success');
  };

  const handleLoadPreset = (presetId: string) => {
    const found = job.my_influencer_presets.find((item) => item.id === presetId);
    if (!found) return;
    setJob((prev) => ({ ...prev, profile: { ...found.profile }, lora_slots: found.lora_slots.map((slot) => ({ ...slot })) }));
    toast(`Loaded preset: ${found.name}`, 'success');
  };

  const handleDeletePreset = (presetId: string) => {
    setJob((prev) => ({ ...prev, my_influencer_presets: prev.my_influencer_presets.filter((item) => item.id !== presetId) }));
  };

  const handleUploadExisting = async (file: File) => {
    setIsUploading(true);
    try {
      const filename = await uploadFileToComfyInput(file);
      const preview = URL.createObjectURL(file);
      if (job.base_preview_url.startsWith('blob:')) URL.revokeObjectURL(job.base_preview_url);
      setJob((prev) => ({ ...prev, base_image_ref: filename, hero_image_ref: filename, base_preview_url: preview }));
      toast('Image uploaded', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinueUploadPath = () => {
    if (!job.base_image_ref) {
      toast('Upload image first', 'error');
      return;
    }
    const characterText = job.upload_identity_notes.trim() || 'consistent identity from uploaded reference portrait';
    setJob((prev) => ({ ...prev, character_lock_text: characterText, character_locked: true }));
    setStep('expression');
  };

  const generateCreateCandidates = async () => {
    const profilePrompt = buildProfilePrompt(job.profile);
    if (!profilePrompt.trim()) {
      toast('Profile prompt is empty', 'error');
      return;
    }
    setIsGeneratingCandidates(true);
    try {
      const generated: CandidateImage[] = [];
      for (let i = 0; i < 4; i += 1) {
        const seed = job.seed_policy === 'fixed' && job.fixed_seed >= 0 ? job.fixed_seed + i : randomSeed();
        const promptId = await startGeneration('z-image', {
          prompt: profilePrompt,
          negative: 'blurry, low quality, bad anatomy, deformed',
          width: 1024,
          height: 1024,
          seed,
          steps: 9,
          cfg: 1,
          loras: normalizeLoraPayload(job.lora_slots),
        });
        const images = await pollGeneration(promptId);
        if (images.length === 0) continue;
        const viewUrl = toViewUrl(images[0]);
        const blob = await fetch(viewUrl).then((r) => r.blob());
        const file = new File([blob], `influencer-candidate-${Date.now()}-${i}.png`, { type: 'image/png' });
        const inputFilename = await uploadFileToComfyInput(file);
        generated.push({ viewUrl: URL.createObjectURL(file), inputFilename });
      }
      if (generated.length === 0) throw new Error('No candidates generated');
      setJob((prev) => ({ ...prev, candidate_images: generated, character_lock_text: profilePrompt }));
      toast('4 candidates generated. Choose your hero.', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to generate candidates', 'error');
    } finally {
      setIsGeneratingCandidates(false);
    }
  };

  const chooseHeroCandidate = (candidate: CandidateImage) => {
    setJob((prev) => ({
      ...prev,
      base_image_ref: candidate.inputFilename,
      hero_image_ref: candidate.inputFilename,
      base_preview_url: candidate.viewUrl,
      character_locked: true,
    }));
    setStep('expression');
    toast('Hero selected and locked', 'success');
  };

  const applyExpressionPreset = (presetId: string) => {
    const preset = EXPRESSION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setJob((prev) => ({ ...prev, expression_preset: presetId, expression_params: { ...DEFAULT_EXPRESSION, ...preset.values } }));
  };

  const runWorkflow = async (workflowId: string, params: Record<string, unknown>, maxCount?: number): Promise<string[]> => {
    const promptId = await startGeneration(workflowId, params);
    const images = await pollGeneration(promptId);
    const urls = images.map((img) => toViewUrl(img));
    return typeof maxCount === 'number' ? urls.slice(0, maxCount) : urls;
  };

  const runExpression = async () => {
    if (!canRunDownstream) {
      toast('Start flow first and lock hero', 'error');
      return;
    }
    setIsGeneratingExpression(true);
    try {
      const urls = await runWorkflow('influencer-expression', {
        image: job.base_image_ref,
        character_lock_text: job.character_lock_text,
        ...job.expression_params,
      });
      setJobPatch({ expression_results: urls });
      setStep('character-v3');
      toast('Expression done', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Expression failed', 'error');
    } finally {
      setIsGeneratingExpression(false);
    }
  };

  const addCharacterV3Refs = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slotsLeft = Math.max(0, 15 - job.characterv3_refs.length);
    if (slotsLeft <= 0) {
      toast('Max 15 refs reached', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const selected = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, slotsLeft);
      const uploaded: string[] = [];
      for (const file of selected) uploaded.push(await uploadFileToComfyInput(file));
      setJob((prev) => ({ ...prev, characterv3_refs: [...prev.characterv3_refs, ...uploaded].slice(0, 15) }));
      toast(`Added ${uploaded.length} refs`, 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Upload refs failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const runCharacterV3 = async () => {
    if (!canRunDownstream) {
      toast('Start flow first and lock hero', 'error');
      return;
    }
    if (job.characterv3_refs.length === 0) {
      toast('Add at least one reference', 'error');
      return;
    }
    setIsGeneratingCharacterV3(true);
    try {
      const refParams: Record<string, unknown> = {};
      for (let i = 0; i < 15; i += 1) refParams[`pose_${i + 1}`] = job.characterv3_refs[i] ?? job.characterv3_refs[0];
      const seed = job.seed_policy === 'fixed' && job.fixed_seed >= 0 ? job.fixed_seed : randomSeed();
      const urls = await runWorkflow('influencer-characterv3', {
        image: job.base_image_ref,
        prompt: job.character_lock_text,
        seed,
        loras: normalizeLoraPayload(job.lora_slots),
        ...refParams,
      });
      setJobPatch({ characterv3_results: urls });
      setStep('automask');
      toast('Character v3 done', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Character v3 failed', 'error');
    } finally {
      setIsGeneratingCharacterV3(false);
    }
  };

  const runAutomask = async () => {
    if (!canRunDownstream) {
      toast('Start flow first and lock hero', 'error');
      return;
    }
    if (!job.replacement_prompt.trim()) {
      toast('Write replacement prompt', 'error');
      return;
    }
    setIsGeneratingAutomask(true);
    try {
      const seed = job.seed_policy === 'fixed' && job.fixed_seed >= 0 ? job.fixed_seed : randomSeed();
      const urls = await runWorkflow('influencer-automask', {
        image: job.base_image_ref,
        prompt: combineCharacterPrompt(job.character_lock_text, job.replacement_prompt),
        seed,
        loras: normalizeLoraPayload(job.lora_slots),
        ...parseMaskTargets(job.mask_query),
      });
      setJobPatch({ automask_results: urls });
      setStep('multi-angle');
      toast('AutoMask done', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'AutoMask failed', 'error');
    } finally {
      setIsGeneratingAutomask(false);
    }
  };

  const runMultiAngle = async () => {
    if (!canRunDownstream) {
      toast('Start flow first and lock hero', 'error');
      return;
    }
    setIsGeneratingMultiAngle(true);
    try {
      const seed = job.seed_policy === 'fixed' && job.fixed_seed >= 0 ? job.fixed_seed : randomSeed();
      const urls = await runWorkflow('qwen-multi-angles', {
        image: job.base_image_ref,
        character_lock_text: job.character_lock_text,
        loras: normalizeLoraPayload(job.lora_slots),
        horizontal_angle: normalizeHorizontalAngleForWorkflow(job.multi_angle.horizontal_angle),
        vertical_angle: job.multi_angle.vertical_angle,
        zoom: job.multi_angle.zoom,
        default_prompts: job.multi_angle.default_prompts,
        camera_view: job.multi_angle.camera_view,
        seed,
      }, Math.max(1, Math.min(6, job.multi_angle.output_count)));
      setJobPatch({ multi_angle_results: urls });
      setStep('review');
      toast('Multi-angle done', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Multi-angle failed', 'error');
    } finally {
      setIsGeneratingMultiAngle(false);
    }
  };

  const hasDuplicateLoras = useMemo(() => {
    const names = job.lora_slots.map((s) => s.name.trim().toLowerCase()).filter(Boolean);
    return new Set(names).size !== names.length;
  }, [job.lora_slots]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-5">
      <div className="max-w-7xl mx-auto space-y-5">
        <section className="rounded-2xl border border-cyan-400/25 bg-[#0a1118] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-cyan-100 tracking-wide">Influencer Studio v2</h2>
              <p className="text-xs text-slate-400 mt-1">Start med enten upload eller create. Hero lock styrer hele resten av pipelinen.</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${job.character_locked ? 'border-emerald-300/25 bg-emerald-500/15 text-emerald-200' : 'border-amber-300/25 bg-amber-500/15 text-amber-200'}`}>
              <Lock className="w-3.5 h-3.5" />
              {job.character_locked ? 'Hero Locked' : 'Not Locked'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STEPS.map((item) => (
              <button key={item.id} onClick={() => setStep(item.id)} className={`rounded-lg border px-3 py-2 text-xs text-left transition-colors ${item.id === step ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
        {step === 'start' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">1. Start Influencer</h3>

            {job.entry_mode === '' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setJobPatch({ entry_mode: 'upload', candidate_images: [] })} className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 p-5 text-left hover:bg-cyan-500/18">
                  <div className="inline-flex items-center gap-2 text-cyan-100 font-semibold"><ImageIcon className="w-4 h-4" /> Upload Existing</div>
                  <p className="mt-2 text-xs text-slate-300">Last opp et ferdig bilde og gå rett til en kort, ryddig lock-flyt.</p>
                </button>
                <button onClick={() => setJobPatch({ entry_mode: 'create' })} className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-5 text-left hover:bg-violet-500/18">
                  <div className="inline-flex items-center gap-2 text-violet-100 font-semibold"><UserPlus className="w-4 h-4" /> Create New Influencer</div>
                  <p className="mt-2 text-xs text-slate-300">Bygg karakter, miks 3 LoRA, generer 4 kandidater, velg hero og auto-lock.</p>
                </button>
              </div>
            )}

            {job.entry_mode === 'upload' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-cyan-100">Upload Existing - kort flyt</p>
                  <button onClick={() => setJobPatch({ entry_mode: '', base_image_ref: '', base_preview_url: '', hero_image_ref: '', character_locked: false })} className="text-xs text-slate-300 hover:text-white">Back</button>
                </div>
                <label className="rounded-lg border border-dashed border-cyan-400/35 bg-black/20 px-3 py-4 flex items-center justify-center gap-2 text-sm text-cyan-200 hover:text-cyan-100 cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Select image'}
                  <input type="file" className="hidden" accept="image/*" onChange={(ev) => { const file = ev.target.files?.[0]; if (file) void handleUploadExisting(file); }} />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-xs text-slate-300">Seed policy
                    <select value={job.seed_policy} onChange={(ev) => setJobPatch({ seed_policy: ev.target.value as 'random' | 'fixed' })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm"><option value="random">Random</option><option value="fixed">Fixed</option></select>
                  </label>
                  <label className="text-xs text-slate-300">Output format
                    <select value={job.output_format} onChange={(ev) => setJobPatch({ output_format: ev.target.value as 'png' | 'jpg' })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm"><option value="png">PNG</option><option value="jpg">JPG</option></select>
                  </label>
                  <label className="text-xs text-slate-300">Optional LoRA
                    <select value={job.lora_slots[0]?.name ?? ''} onChange={(ev) => updateLora(0, { name: ev.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
                      <option value="">None</option>
                      {availableLoras.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                </div>
                <label className="text-xs text-slate-300 block">Identity notes (optional)
                  <input value={job.upload_identity_notes} onChange={(ev) => setJobPatch({ upload_identity_notes: ev.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm" placeholder="core identity notes" />
                </label>
                {job.base_preview_url && <img src={job.base_preview_url} alt="Uploaded base" className="max-h-72 rounded-lg border border-white/10" />}
                <div className="flex justify-end">
                  <button onClick={handleContinueUploadPath} disabled={!job.base_image_ref} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50">Continue to Expression</button>
                </div>
              </div>
            )}

            {job.entry_mode === 'create' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-violet-100">Create New Influencer</p>
                  <button onClick={() => setJobPatch({ entry_mode: '', candidate_images: [], base_image_ref: '', hero_image_ref: '', character_locked: false })} className="text-xs text-slate-300 hover:text-white">Back</button>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <select onChange={(ev) => handleLoadPreset(ev.target.value)} defaultValue="" className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100">
                      <option value="">My Influencers</option>
                      {job.my_influencer_presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input value={presetName} onChange={(ev) => setPresetName(ev.target.value)} className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100" placeholder="Preset name" />
                    <button onClick={handleSavePreset} className="rounded-md border border-emerald-300/35 bg-emerald-500/15 px-2 py-1.5 text-xs text-emerald-100 inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</button>
                  </div>
                  {job.my_influencer_presets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.my_influencer_presets.map((p) => (
                        <button key={p.id} onClick={() => handleDeletePreset(p.id)} className="rounded-md border border-rose-300/35 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 inline-flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <label className="text-[11px] text-slate-300">Preset
                    <select onChange={(ev) => applyProfilePreset(ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs">
                      <option value="none">Custom</option>
                      <option value="editorial">Editorial</option>
                      <option value="street">Street</option>
                      <option value="beauty">Beauty</option>
                    </select>
                  </label>
                  <label className="text-[11px] text-slate-300">Gender
                    <select value={job.profile.gender} onChange={(ev) => setProfileField('gender', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="woman">Woman</option><option value="man">Man</option><option value="androgynous">Androgynous</option></select>
                  </label>
                  <label className="text-[11px] text-slate-300">Age (adult)
                    <select value={job.profile.age_range} onChange={(ev) => setProfileField('age_range', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="adult-18-24">18-24</option><option value="adult-25-34">25-34</option><option value="adult-35-44">35-44</option><option value="adult-45-60">45-60</option></select>
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="text-[11px] text-slate-300">Hair style
                    <select value={job.profile.hair_style} onChange={(ev) => setProfileField('hair_style', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="buzzcut">Buzzcut</option><option value="bob">Bob</option><option value="straight-medium">Straight Medium</option><option value="long-wavy">Long Wavy</option><option value="curly-long">Curly Long</option><option value="ponytail">Ponytail</option><option value="braids">Braids</option><option value="slick-back">Slick Back</option></select>
                  </label>
                  <label className="text-[11px] text-slate-300">Hair color
                    <select value={job.profile.hair_color} onChange={(ev) => setProfileField('hair_color', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="black">Black</option><option value="brown">Brown</option><option value="dark-blonde">Dark Blonde</option><option value="blonde">Blonde</option><option value="red">Red</option><option value="silver">Silver</option></select>
                  </label>
                  <label className="text-[11px] text-slate-300">Eye color
                    <select value={job.profile.eye_color} onChange={(ev) => setProfileField('eye_color', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="brown">Brown</option><option value="hazel">Hazel</option><option value="green">Green</option><option value="blue">Blue</option><option value="gray">Gray</option></select>
                  </label>
                  <label className="text-[11px] text-slate-300">Skin tone
                    <select value={job.profile.skin_tone} onChange={(ev) => setProfileField('skin_tone', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="fair">Fair</option><option value="light">Light</option><option value="olive">Olive</option><option value="tan">Tan</option><option value="deep">Deep</option></select>
                  </label>
                </div>

                <button onClick={() => setJob((prev) => ({ ...prev, profile_advanced: !prev.profile_advanced }))} className="text-xs text-cyan-200 hover:text-cyan-100">
                  {job.profile_advanced ? 'Hide Advanced' : 'Show Advanced (adult-only details)'}
                </button>
                {job.profile_advanced && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
                    <label className="text-[11px] text-slate-300">Height<select value={job.profile.height} onChange={(ev) => setProfileField('height', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="petite">Petite</option><option value="average">Average</option><option value="tall">Tall</option><option value="very-tall">Very Tall</option></select></label>
                    <label className="text-[11px] text-slate-300">Body<select value={job.profile.body_type} onChange={(ev) => setProfileField('body_type', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="slim">Slim</option><option value="slim-athletic">Slim Athletic</option><option value="athletic">Athletic</option><option value="curvy">Curvy</option><option value="plus-size">Plus Size</option></select></label>
                    <label className="text-[11px] text-slate-300">Chest<select value={job.profile.chest_size} onChange={(ev) => setProfileField('chest_size', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs"><option value="small">Small</option><option value="small-medium">Small-Medium</option><option value="medium">Medium</option><option value="full">Full</option></select></label>
                    <label className="text-[11px] text-slate-300">Makeup<input value={job.profile.makeup_style} onChange={(ev) => setProfileField('makeup_style', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" /></label>
                    <label className="text-[11px] text-slate-300 col-span-2">Fashion<input value={job.profile.fashion_style} onChange={(ev) => setProfileField('fashion_style', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" /></label>
                    <label className="text-[11px] text-slate-300 col-span-2">Custom notes<input value={job.profile.custom_notes} onChange={(ev) => setProfileField('custom_notes', ev.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" /></label>
                    <label className="text-[11px] text-slate-300 flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-2 py-1.5">Freckles<input type="checkbox" checked={job.profile.freckles} onChange={(ev) => setProfileField('freckles', ev.target.checked)} /></label>
                    <label className="text-[11px] text-slate-300 flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-2 py-1.5">Tattoos<input type="checkbox" checked={job.profile.tattoos} onChange={(ev) => setProfileField('tattoos', ev.target.checked)} /></label>
                    <label className="text-[11px] text-slate-300 flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-2 py-1.5">Glasses<input type="checkbox" checked={job.profile.glasses} onChange={(ev) => setProfileField('glasses', ev.target.checked)} /></label>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {VIBE_OPTIONS.map((tag) => (
                    <button key={tag} onClick={() => toggleVibe(tag)} className={`rounded-md border px-2 py-1 text-[11px] ${job.profile.vibe_tags.includes(tag) ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-black/30 text-slate-300'}`}>
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/5 p-3 space-y-2">
                  <p className="text-xs text-emerald-200">3-LoRA Mix (required for create-flow)</p>
                  {job.lora_slots.map((slot, idx) => (
                    <div key={`lora-${idx}`} className="grid grid-cols-[1fr_140px] gap-2 items-center">
                      <select value={slot.name} onChange={(ev) => updateLora(idx, { name: ev.target.value })} className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100">
                        <option value="">Select LoRA #{idx + 1}</option>
                        {availableLoras.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <label className="text-[11px] text-slate-300">{slot.weight.toFixed(2)}
                        <input type="range" min={-4} max={4} step={0.01} value={slot.weight} onChange={(ev) => updateLora(idx, { weight: Number(ev.target.value) })} className="w-full" />
                      </label>
                    </div>
                  ))}
                  {hasDuplicateLoras && <p className="text-xs text-rose-300">LoRA slots must be unique</p>}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400 truncate">{buildProfilePrompt(job.profile)}</div>
                  <button onClick={() => void generateCreateCandidates()} disabled={isGeneratingCandidates || hasDuplicateLoras} className="rounded-lg border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-sm text-violet-100 hover:bg-violet-500/25 disabled:opacity-50 inline-flex items-center gap-2">
                    {isGeneratingCandidates ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Generate 4 Candidates
                  </button>
                </div>

                {job.candidate_images.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {job.candidate_images.map((candidate, idx) => (
                      <button key={`${candidate.inputFilename}-${idx}`} onClick={() => chooseHeroCandidate(candidate)} className="rounded-lg border border-white/10 bg-black/30 p-2 hover:border-cyan-300/40">
                        <img src={candidate.viewUrl} alt={`Candidate ${idx + 1}`} className="w-full rounded-md border border-white/10" />
                        <p className="mt-2 text-[11px] text-cyan-100">Set as Hero</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 'expression' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">2. Expression</h3>
            <div className="flex flex-wrap gap-2">
              {EXPRESSION_PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => applyExpressionPreset(preset.id)} className={`rounded-md px-3 py-1.5 text-xs border ${job.expression_preset === preset.id ? 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-black/30 text-slate-200 hover:bg-white/5'}`}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(DEFAULT_EXPRESSION) as Array<keyof ExpressionParams>).map((key) => (
                <label key={key} className="text-[11px] text-slate-300 block">{key}: {job.expression_params[key].toFixed(2)}
                  <input type="range" min={-1} max={1} step={0.01} value={job.expression_params[key]} onChange={(ev) => setJob((prev) => ({ ...prev, expression_params: { ...prev.expression_params, [key]: Number(ev.target.value) }, expression_preset: 'custom' }))} className="mt-1 w-full" />
                </label>
              ))}
            </div>
            <div className="flex justify-end"><button onClick={() => void runExpression()} disabled={isGeneratingExpression} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50">{isGeneratingExpression ? 'Running...' : 'Run Expression'}</button></div>
            {job.expression_results.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{job.expression_results.map((url) => <img key={url} src={url} alt="Expression" className="rounded-lg border border-white/10" />)}</div>}
          </section>
        )}

        {step === 'character-v3' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">3. Character v3</h3>
            <label className="rounded-lg border border-dashed border-cyan-400/35 bg-black/20 px-3 py-3 flex items-center justify-center gap-2 text-sm text-cyan-200 hover:text-cyan-100 cursor-pointer">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Add up to 15 references
              <input type="file" className="hidden" accept="image/*" multiple onChange={(ev) => void addCharacterV3Refs(ev.target.files)} />
            </label>
            <p className="text-xs text-slate-400">Refs: {job.characterv3_refs.length}/15</p>
            <div className="flex justify-end"><button onClick={() => void runCharacterV3()} disabled={isGeneratingCharacterV3 || job.characterv3_refs.length === 0} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50">{isGeneratingCharacterV3 ? 'Running...' : 'Run Character v3'}</button></div>
            {job.characterv3_results.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{job.characterv3_results.map((url) => <img key={url} src={url} alt="Character v3" className="rounded-lg border border-white/10" />)}</div>}
          </section>
        )}

        {step === 'automask' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">4. AutoMask</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="text-xs text-slate-300 block">Mask what<input value={job.mask_query} onChange={(ev) => setJobPatch({ mask_query: ev.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100" /></label>
              <label className="text-xs text-slate-300 block">Replace with<input value={job.replacement_prompt} onChange={(ev) => setJobPatch({ replacement_prompt: ev.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100" /></label>
            </div>
            <div className="flex justify-end"><button onClick={() => void runAutomask()} disabled={isGeneratingAutomask} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50">{isGeneratingAutomask ? 'Running...' : 'Run AutoMask'}</button></div>
            {job.automask_results.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{job.automask_results.map((url) => <img key={url} src={url} alt="AutoMask" className="rounded-lg border border-white/10" />)}</div>}
          </section>
        )}

        {step === 'multi-angle' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">5. Multi-Angle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <label className="text-xs text-slate-300">Horizontal: {job.multi_angle.horizontal_angle}<input type="range" min={-180} max={180} step={1} value={job.multi_angle.horizontal_angle} onChange={(ev) => setJob((prev) => ({ ...prev, multi_angle: { ...prev.multi_angle, horizontal_angle: Number(ev.target.value) } }))} className="mt-1 w-full" /></label>
              <label className="text-xs text-slate-300">Vertical: {job.multi_angle.vertical_angle}<input type="range" min={-60} max={60} step={1} value={job.multi_angle.vertical_angle} onChange={(ev) => setJob((prev) => ({ ...prev, multi_angle: { ...prev.multi_angle, vertical_angle: Number(ev.target.value) } }))} className="mt-1 w-full" /></label>
              <label className="text-xs text-slate-300">Zoom: {job.multi_angle.zoom.toFixed(1)}<input type="range" min={1} max={12} step={0.1} value={job.multi_angle.zoom} onChange={(ev) => setJob((prev) => ({ ...prev, multi_angle: { ...prev.multi_angle, zoom: Number(ev.target.value) } }))} className="mt-1 w-full" /></label>
            </div>
            <div className="flex justify-end"><button onClick={() => void runMultiAngle()} disabled={isGeneratingMultiAngle} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50">{isGeneratingMultiAngle ? 'Running...' : 'Run Multi-Angle'}</button></div>
            {job.multi_angle_results.length > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{job.multi_angle_results.map((url) => <img key={url} src={url} alt="Multi-angle" className="rounded-lg border border-white/10" />)}</div>}
          </section>
        )}

        {step === 'review' && (
          <section className="rounded-2xl border border-white/10 bg-[#0d131a] p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">6. Review</h3>
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
              <p className="font-medium inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Influencer Summary</p>
              <p className="mt-2">entry_mode: {job.entry_mode || 'not set'}</p>
              <p>hero_image_ref: {job.hero_image_ref || 'missing'}</p>
              <p>character_lock_text: {job.character_lock_text ? 'set' : 'missing'}</p>
              <p>loras: {job.lora_slots.map((slot) => `${slot.name || '[none]'} (${slot.weight.toFixed(2)})`).join(' | ')}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-200 mb-2">Expression ({job.expression_results.length})</p><div className="grid grid-cols-2 gap-2">{job.expression_results.slice(0, 4).map((url) => <img key={url} src={url} alt="Expression" className="rounded border border-white/10" />)}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-200 mb-2">Character v3 ({job.characterv3_results.length})</p><div className="grid grid-cols-2 gap-2">{job.characterv3_results.slice(0, 4).map((url) => <img key={url} src={url} alt="Character v3" className="rounded border border-white/10" />)}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-200 mb-2">AutoMask ({job.automask_results.length})</p><div className="grid grid-cols-2 gap-2">{job.automask_results.slice(0, 4).map((url) => <img key={url} src={url} alt="AutoMask" className="rounded border border-white/10" />)}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-200 mb-2">Multi-Angle ({job.multi_angle_results.length})</p><div className="grid grid-cols-2 gap-2">{job.multi_angle_results.slice(0, 4).map((url) => <img key={url} src={url} alt="Multi-angle" className="rounded border border-white/10" />)}</div></div>
            </div>
            <div className="flex justify-end"><button onClick={() => setStep('multi-angle')} className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Re-run Multi-Angle</button></div>
          </section>
        )}
      </div>
    </div>
  );
};
