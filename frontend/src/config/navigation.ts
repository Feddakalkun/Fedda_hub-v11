import {
  Film,
  Images,
  LayoutDashboard,
  MessageSquare,
  Music,
  Sparkles,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface PageMeta {
  label: string;
  description: string;
  Icon: LucideIcon;
}

export interface NavNode {
  id: string;
  label: string;
  subitems?: NavNode[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  subitems?: NavNode[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    label: 'CREATE',
    items: [
      { id: 'chat', label: 'Agent Chat', icon: MessageSquare },
      {
        id: 'image',
        label: 'Image Studio',
        icon: Sparkles,
        subitems: [
          {
            id: 'z-image',
            label: 'Z-Image',
            subitems: [{ id: 'z-image-txt2img', label: 'Txt2Img' }],
          },
          {
            id: 'flux',
            label: 'FLUX2-KLEIN',
            subitems: [{ id: 'flux-txt2img', label: 'Txt2Img' }],
          },
          {
            id: 'qwen',
            label: 'Qwen',
            subitems: [
              { id: 'qwen-txt2img', label: 'Txt2Img' },
              { id: 'qwen-image-ref', label: 'Image Reference' },
              { id: 'qwen-multi-angle', label: 'Multi Angles' },
            ],
          },
          {
            id: 'image-other',
            label: 'Other',
            subitems: [{ id: 'image-influencer', label: 'Influencer' }],
          },
        ],
      },
      {
        id: 'video',
        label: 'Video Studio',
        icon: Video,
        subitems: [
          { id: 'wan21-steady-dancer', label: 'WAN 2.1 - Steady Dancer' },
          { id: 'wan22-vid2vid', label: 'WAN 2.2 - Vid2Vid' },
          { id: 'wan22-img2vid', label: 'WAN 2.2 - Img2Vid' },
          { id: 'wan22-img2vid-6frames', label: 'WAN 2.2 - Story (6 Frames)' },
          { id: 'ltx-flf', label: 'LTX - First/Last Frame' },
          { id: 'ltx-img-audio', label: 'LTX - Img + Audio Lipsync' },
        ],
      },
      { id: 'audio', label: 'Audio / SFX', icon: Music },
    ],
  },
  {
    label: 'EXPLORE',
    items: [
      { id: 'gallery', label: 'Gallery', icon: Images },
      { id: 'videos', label: 'Videos', icon: Film },
      { id: 'library', label: 'LoRA Library', icon: LayoutDashboard },
    ],
  },
];

const collectNodeIds = (nodes: NavNode[]): string[] =>
  nodes.flatMap((node) => [node.id, ...(node.subitems ? collectNodeIds(node.subitems) : [])]);

const collectedTabIds = SIDEBAR_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) => [item.id, ...(item.subitems ? collectNodeIds(item.subitems) : [])]),
);

export const VALID_TABS = new Set<string>([
  ...collectedTabIds,
  // Legacy alias still accepted by page switch logic.
  'ltx',
]);

export const PAGE_META: Record<string, PageMeta> = {
  chat: { label: 'Agent Chat', description: 'Your AI assistant and creative collaborator.', Icon: MessageSquare },
  image: { label: 'Image Studio', description: 'Generate and edit images with advanced AI models.', Icon: Sparkles },
  'z-image': { label: 'Z-Image', description: 'Z-Image workflow family.', Icon: Sparkles },
  'z-image-txt2img': { label: 'Z-Image (Txt2Img)', description: 'Premium text to image generation using z-image workflow.', Icon: Sparkles },
  flux: { label: 'FLUX2-KLEIN Studio', description: 'FLUX2-KLEIN workflow family.', Icon: Sparkles },
  'flux-txt2img': { label: 'FLUX2-KLEIN (Txt2Img)', description: 'Txt2Img workspace for FLUX2-KLEIN.', Icon: Sparkles },
  qwen: { label: 'Qwen Studio', description: 'Qwen workflow family.', Icon: Sparkles },
  'qwen-txt2img': { label: 'Qwen (Txt2Img)', description: 'Txt2Img workspace for Qwen.', Icon: Sparkles },
  'qwen-image-ref': { label: 'Qwen (Image Reference)', description: 'Generate from a reference image to keep character identity.', Icon: Sparkles },
  'qwen-multi-angle': { label: 'Qwen (Multi Angles)', description: 'Upload one image and generate camera-angle variants.', Icon: Sparkles },
  'image-other': { label: 'Other Workflows', description: 'Uncategorized image processing capabilities.', Icon: Sparkles },
  'image-influencer': {
    label: 'Influencer',
    description: 'Identity-locked influencer pipeline: expression, automask, and multi-angle.',
    Icon: Sparkles,
  },
  video: { label: 'Video Studio', description: 'Create and animate video sequences with WAN.', Icon: Video },
  'wan21-steady-dancer': {
    label: 'WAN 2.1 Steady Dancer',
    description: 'Transfer motion from a reference video onto a selected subject image.',
    Icon: Video,
  },
  'wan22-vid2vid': { label: 'WAN 2.2 Vid2Vid', description: 'Extend and transform video with WAN 2.2.', Icon: Video },
  'wan22-img2vid': { label: 'WAN 2.2 Img2Vid', description: 'Animate a still image into video with WAN 2.2.', Icon: Video },
  'wan22-img2vid-6frames': { label: 'WAN 2.2 Story (6 Frames)', description: 'Animate a sequence into a full video with WAN 2.2.', Icon: Video },
  ltx: { label: 'LTX Video', description: 'LTX Video 2.3 - cinematic AI video generation.', Icon: Film },
  'ltx-flf': { label: 'LTX - First / Last Frame', description: 'Generate video between two keyframes with LTX 2.3.', Icon: Film },
  'ltx-img-audio': { label: 'LTX - Img + Audio Lipsync', description: 'Generate lipsync video from image and audio with LTX 2.3.', Icon: Film },
  audio: { label: 'Audio / SFX', description: 'Generate music, voice, and sound effects.', Icon: Music },
  gallery: { label: 'Gallery', description: 'Browse and manage your generated images.', Icon: Images },
  videos: { label: 'Videos', description: 'View and manage your generated video files.', Icon: Film },
  library: { label: 'LoRA Library', description: 'Manage your installed LoRA models.', Icon: LayoutDashboard },
};

export const TOP_QUICK_LINKS = ['gallery', 'videos', 'library'] as const;
