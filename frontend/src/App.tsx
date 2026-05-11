import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Film, Images, LayoutDashboard, MessageSquare, Music, Sparkles, Video } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { TopSystemStrip } from './components/ui/TopSystemStrip';
import { ToastProvider } from './components/ui/Toast';
import { ComfyExecutionProvider } from './contexts/ComfyExecutionContext';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ImageStudioPage } from './pages/ImageStudioPage';
import { VideoStudioPage } from './pages/VideoStudioPage';
import { LibraryPage } from './pages/LibraryPage';
import { AgentChatPage } from './pages/AgentChatPage';
import { GalleryPage } from './pages/GalleryPage';
import { VideosPage } from './pages/VideosPage';
import { XxxStudioPage } from './pages/XxxStudioPage';
import { SectionGroup, StudioCard, ToolCard } from './components/layout/V11Cards';

type RootSection = 'hub' | 'image' | 'video' | 'xxx' | 'explore';

type ToolItem = { tab: string; label: string; description: string };

const CARD_IMAGE_BY_TAB: Record<string, string> = {
  chat: '/cards/v3/MMWqX.jpg',
  image: '/cards/v3/HRr18.jpg',
  video: '/cards/v3/QE0IX.jpg',
  audio: '/cards/v3/PU7nF.jpg',
  explore: '/cards/v3/STksW.jpg',
  'z-image-txt2img': '/cards/v3/AnEPX.jpg',
  'z-image-dual-lora': '/cards/v3/vbFlr.jpg',
  'z-image-img2img': '/cards/v3/2UU59.jpg',
  'flux-txt2img': '/cards/v3/fnaDN.jpg',
  'qwen-txt2img': '/cards/v3/AnEPX.jpg',
  'qwen-image-ref': '/cards/v3/GC5FX.jpg',
  'qwen-multi-angle': '/cards/v3/yoR25.jpg',
  'image-influencer': '/cards/v3/IeDkz.jpg',
  'sdxl-default': '/cards/v3/sdxl-default.jpg',
  'sdxl-controlnet': '/cards/v3/sdxl-controlnet.jpg',
  'sdxl-batch-processor': '/cards/v3/sdxl-batch-processor.jpg',
  'sdxl-ip-adapter-2x-img2img': '/cards/v3/sdxl-ip-adapter-2x-img2img.jpg',
  'sdxl-2000px-latent-upscale': '/cards/v3/sdxl-2000px-latent-upscale.jpg',
  'sdxl-remove-background': '/cards/v3/sdxl-remove-background.jpg',
  'sdxl-cn-openpose': '/cards/v3/sdxl-cn-openpose.jpg',
  'sdxl-ip-adapter-style-transfer': '/cards/v3/sdxl-ip-adapter-style-transfer.jpg',
  'sdxl-ip-adapter-img2img': '/cards/v3/sdxl-ip-adapter-img2img.jpg',
  'sdxl-inpaint-pro': '/cards/v3/sdxl-inpaint-pro.jpg',
  'sdxl-cn-canny': '/cards/v3/sdxl-cn-canny.jpg',
  'sdxl-sd-upscale': '/cards/v3/sdxl-sd-upscale.jpg',
  'sdxl-cn-depth': '/cards/v3/sdxl-cn-depth.jpg',
  'sdxl-outpaint': '/cards/v3/sdxl-outpaint.jpg',
  'sdxl-sd-image': '/cards/v3/sdxl-sd-image.jpg',
  'wan21-steady-dancer': '/cards/v3/lhEio.jpg',
  'wan22-vid2vid': '/cards/v3/m7uVu.jpg',
  'wan22-img2vid': '/cards/v3/aBmCG.jpg',
  'wan22-img2vid-6frames': '/cards/v3/wLvUt.jpg',
  'ltx-flf': '/cards/v3/ru6TJ.jpg',
  'ltx-img-audio': '/cards/v3/PU7nF.jpg',
  xxx: '/cards/v3/xxx1.jpg',
  'xxx-influencer': '/cards/v3/influencer.jpg',
  'xxx-realism-sdxl': '/cards/v3/realism-sdxl.jpg',
  'xxx-sdxl-batch': '/cards/v3/sdxl-xxx-batch.jpg',
  'xxx-klein-nsfw': '/cards/v3/klein-nsfw.jpg',
  'xxx-flux': '/cards/v3/flux-xxx.jpg',
  'xxx-wan22': '/cards/v3/wan-22-xxx.jpg',
  'xxx-wan-img2vid': '/cards/v3/wan-22-xxx.jpg',
  'xxx-bouncy-walk': '/cards/v3/bouncy-walk.jpg',
  'xxx-infinite-video': '/cards/v3/infinite-sex-video.jpg',
  'xxx-blowjob-img2vid': '/cards/v3/blowjob-img2vid.jpg',
  'xxx-blowjob-vid2vid': '/cards/v3/blowjob-vid2vid.jpg',
  gallery: '/cards/v3/qO65L.jpg',
  videos: '/cards/v3/aqGon.jpg',
  library: '/cards/v3/ebnw3.jpg',
};

const HUB_CARDS: Array<{
  id: RootSection;
  label: string;
  description: string;
  Icon: typeof Sparkles;
  image: string;
  directTab?: string;
}> = [
  {
    id: 'hub',
    label: 'Agent Chat',
    description: 'Assistant, planning and execution.',
    Icon: MessageSquare,
    image: CARD_IMAGE_BY_TAB.chat,
    directTab: 'chat',
  },
  {
    id: 'image',
    label: 'Image Studio',
    description: 'Z-Image, Qwen, FLUX and Influencer.',
    Icon: Sparkles,
    image: CARD_IMAGE_BY_TAB.image,
  },
  {
    id: 'video',
    label: 'Video Studio',
    description: 'WAN and LTX pipelines.',
    Icon: Video,
    image: CARD_IMAGE_BY_TAB.video,
  },
  {
    id: 'xxx',
    label: 'XXX',
    description: 'Private workflow collection.',
    Icon: Film,
    image: CARD_IMAGE_BY_TAB.xxx,
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Gallery, videos and LoRA library.',
    Icon: Images,
    image: CARD_IMAGE_BY_TAB.explore,
  },
];

const TOOL_GROUPS: Record<Exclude<RootSection, 'hub'>, Array<{ title: string; tools: ToolItem[] }>> = {
  image: [
    {
      title: 'Z-Image',
      tools: [
        { tab: 'z-image-txt2img', label: 'Txt2Img', description: 'Core Z-Image generation.' },
        { tab: 'z-image-img2img', label: 'Img2Img', description: 'Pose-preserving image-to-image refinement.' },
        { tab: 'z-image-dual-lora', label: 'Dual LoRA', description: 'Two-character staged workflow.' },
      ],
    },
    {
      title: 'FLUX2-KLEIN',
      tools: [{ tab: 'flux-txt2img', label: 'Txt2Img', description: 'FLUX2-KLEIN generation.' }],
    },
    {
      title: 'Qwen',
      tools: [
        { tab: 'qwen-txt2img', label: 'Txt2Img', description: 'Qwen image generation.' },
        { tab: 'qwen-image-ref', label: 'Image Reference', description: 'Keep identity with image guidance.' },
        { tab: 'qwen-multi-angle', label: 'Multi Angles', description: 'Camera-angle variants from one source.' },
      ],
    },
    {
      title: 'Other',
      tools: [{ tab: 'image-influencer', label: 'Influencer', description: 'Guided influencer creation flow.' }],
    },
    {
      title: 'SD IMAGE',
      tools: [
        { tab: 'sdxl-default', label: 'Default SDXL', description: 'Core SDXL text-to-image generation.' },
        { tab: 'sdxl-controlnet', label: 'ControlNet', description: 'ControlNet guided generation.' },
        { tab: 'sdxl-batch-processor', label: 'Batch Processor', description: 'Batch-oriented SDXL processing.' },
        { tab: 'sdxl-ip-adapter-2x-img2img', label: 'IP Adapter 2x Img2Img', description: 'Dual-pass IP Adapter img2img.' },
        { tab: 'sdxl-2000px-latent-upscale', label: '2000PX Latent Upscale', description: 'Latent upscale quality pipeline.' },
        { tab: 'sdxl-remove-background', label: 'Remove BG', description: 'Background removal workflow.' },
        { tab: 'sdxl-cn-openpose', label: 'CN OpenPose', description: 'OpenPose-conditioned ControlNet.' },
        { tab: 'sdxl-ip-adapter-style-transfer', label: 'IP Adapter Style Transfer', description: 'Style transfer with IP Adapter.' },
        { tab: 'sdxl-ip-adapter-img2img', label: 'IP Adapter Img2Img', description: 'IP Adapter image-to-image flow.' },
        { tab: 'sdxl-inpaint-pro', label: 'Inpaint Pro', description: 'Advanced inpainting workflow.' },
        { tab: 'sdxl-cn-canny', label: 'CN Canny', description: 'Canny-conditioned ControlNet.' },
        { tab: 'sdxl-sd-upscale', label: 'SD Upscale', description: 'Super-resolution upscale flow.' },
        { tab: 'sdxl-cn-depth', label: 'CN Depth', description: 'Depth-conditioned ControlNet.' },
        { tab: 'sdxl-outpaint', label: 'Outpaint', description: 'Canvas extension workflow.' },
      ],
    },
  ],
  video: [
    {
      title: 'WAN',
      tools: [
        { tab: 'wan21-steady-dancer', label: 'WAN 2.1 Steady Dancer', description: 'Motion transfer from reference video.' },
        { tab: 'wan22-vid2vid', label: 'WAN 2.2 Vid2Vid', description: 'Transform existing video.' },
        { tab: 'wan22-img2vid', label: 'WAN 2.2 Img2Vid', description: 'Animate still images.' },
        { tab: 'wan22-img2vid-6frames', label: 'WAN 2.2 Story (6 Frames)', description: 'Storyboard to video pipeline.' },
      ],
    },
    {
      title: 'LTX',
      tools: [
        { tab: 'ltx-flf', label: 'First / Last Frame', description: 'Generate in-between sequence from keyframes.' },
        { tab: 'ltx-img-audio', label: 'Img + Audio Lipsync', description: 'Lipsync from image + audio.' },
      ],
    },
  ],
  xxx: [
    {
      title: 'XXX Image',
      tools: [
        { tab: 'xxx-influencer', label: 'Influencer', description: 'Influencer workflow variant.' },
        { tab: 'xxx-realism-sdxl', label: 'Realism SDXL', description: 'Realism SDXL workflow.' },
        { tab: 'xxx-sdxl-batch', label: 'SDXL Batch', description: 'Batch SDXL generation.' },
        { tab: 'xxx-klein-nsfw', label: 'Klein NSFW', description: 'FLUX/Klein variant.' },
        { tab: 'xxx-flux', label: 'Flux XXX', description: 'Flux image workflow.' },
      ],
    },
    {
      title: 'XXX Video',
      tools: [
        { tab: 'xxx-wan22', label: 'WAN 22 XXX', description: 'WAN 2.2 variant.' },
        { tab: 'xxx-wan-img2vid', label: 'WAN Img2Vid XXX', description: 'WAN image to video variant.' },
        { tab: 'xxx-bouncy-walk', label: 'Bouncy Walk', description: 'Motion video workflow.' },
        { tab: 'xxx-infinite-video', label: 'Infinite Video', description: 'Long-form video workflow.' },
        { tab: 'xxx-blowjob-img2vid', label: 'BJ Img2Vid', description: 'Image to video variant.' },
        { tab: 'xxx-blowjob-vid2vid', label: 'BJ Vid2Vid', description: 'Video to video variant.' },
      ],
    },
  ],
  explore: [
    {
      title: 'Explore',
      tools: [
        { tab: 'gallery', label: 'Gallery', description: 'Image history and downloads.' },
        { tab: 'videos', label: 'Videos', description: 'Video history and downloads.' },
        { tab: 'library', label: 'LoRA Library', description: 'Install and manage LoRAs.' },
      ],
    },
  ],
};

const VALID_TABS = new Set([
  'chat',
  'image',
  'z-image',
  'z-image-txt2img',
  'z-image-dual-lora',
  'z-image-img2img',
  'flux',
  'flux-txt2img',
  'qwen',
  'qwen-txt2img',
  'qwen-image-ref',
  'qwen-multi-angle',
  'image-other',
  'image-influencer',
  'sdxl-default',
  'sdxl-controlnet',
  'sdxl-batch-processor',
  'sdxl-ip-adapter-2x-img2img',
  'sdxl-2000px-latent-upscale',
  'sdxl-remove-background',
  'sdxl-cn-openpose',
  'sdxl-ip-adapter-style-transfer',
  'sdxl-ip-adapter-img2img',
  'sdxl-inpaint-pro',
  'sdxl-cn-canny',
  'sdxl-sd-upscale',
  'sdxl-cn-depth',
  'sdxl-outpaint',
  'sdxl-sd-image',
  'video',
  'wan21-steady-dancer',
  'wan22-vid2vid',
  'wan22-img2vid',
  'wan22-img2vid-6frames',
  'ltx',
  'ltx-flf',
  'ltx-img-audio',
  'xxx',
  'xxx-influencer',
  'xxx-realism-sdxl',
  'xxx-sdxl-batch',
  'xxx-klein-nsfw',
  'xxx-flux',
  'xxx-wan22',
  'xxx-wan-img2vid',
  'xxx-bouncy-walk',
  'xxx-infinite-video',
  'xxx-blowjob-img2vid',
  'xxx-blowjob-vid2vid',
  'audio',
  'gallery',
  'videos',
  'library',
]);

const PAGE_META: Record<string, { label: string; description: string; Icon: typeof Sparkles }> = {
  chat: { label: 'Agent Chat', description: 'Your AI assistant and creative collaborator.', Icon: MessageSquare },
  image: { label: 'Image Studio', description: 'Generate and edit images with advanced AI models.', Icon: Sparkles },
  'z-image': { label: 'Z-Image', description: 'Z-Image workflow family.', Icon: Sparkles },
  'z-image-txt2img': { label: 'Z-Image (Txt2Img)', description: 'Premium text to image generation.', Icon: Sparkles },
  'z-image-dual-lora': { label: 'Z-Image (Dual LoRA)', description: 'Two-person staged workflow.', Icon: Sparkles },
  'z-image-img2img': { label: 'Z-Image (Img2Img)', description: 'Pose-preserving image-to-image workflow.', Icon: Sparkles },
  flux: { label: 'FLUX2-KLEIN Studio', description: 'FLUX2-KLEIN workflow family.', Icon: Sparkles },
  'flux-txt2img': { label: 'FLUX2-KLEIN (Txt2Img)', description: 'Txt2Img workspace for FLUX2-KLEIN.', Icon: Sparkles },
  qwen: { label: 'Qwen Studio', description: 'Qwen workflow family.', Icon: Sparkles },
  'qwen-txt2img': { label: 'Qwen (Txt2Img)', description: 'Txt2Img workspace for Qwen.', Icon: Sparkles },
  'qwen-image-ref': { label: 'Qwen (Image Reference)', description: 'Generate from a reference image.', Icon: Sparkles },
  'qwen-multi-angle': { label: 'Qwen (Multi Angles)', description: 'Generate camera-angle variants.', Icon: Sparkles },
  'image-other': { label: 'Other Workflows', description: 'Uncategorized image workflows.', Icon: Sparkles },
  'image-influencer': { label: 'Influencer', description: 'Identity-locked creator workflow.', Icon: Sparkles },
  'sdxl-default': { label: 'Default SDXL', description: 'Core SDXL text-to-image workflow.', Icon: Sparkles },
  'sdxl-controlnet': { label: 'ControlNet', description: 'SDXL ControlNet workflow.', Icon: Sparkles },
  'sdxl-batch-processor': { label: 'Batch Processor', description: 'SDXL batch processor workflow.', Icon: Sparkles },
  'sdxl-ip-adapter-2x-img2img': { label: 'IP Adapter 2x Img2Img', description: 'Dual IP Adapter image-to-image flow.', Icon: Sparkles },
  'sdxl-2000px-latent-upscale': { label: '2000PX Latent Upscale', description: 'High-quality latent upscale workflow.', Icon: Sparkles },
  'sdxl-remove-background': { label: 'Remove BG', description: 'Background removal workflow.', Icon: Sparkles },
  'sdxl-cn-openpose': { label: 'CN OpenPose', description: 'OpenPose ControlNet workflow.', Icon: Sparkles },
  'sdxl-ip-adapter-style-transfer': { label: 'IP Adapter Style Transfer', description: 'Style-transfer workflow with IP Adapter.', Icon: Sparkles },
  'sdxl-ip-adapter-img2img': { label: 'IP Adapter Img2Img', description: 'IP Adapter image-guided workflow.', Icon: Sparkles },
  'sdxl-inpaint-pro': { label: 'Inpaint Pro', description: 'Advanced inpainting workflow.', Icon: Sparkles },
  'sdxl-cn-canny': { label: 'CN Canny', description: 'Canny edge ControlNet workflow.', Icon: Sparkles },
  'sdxl-sd-upscale': { label: 'SD Upscale', description: 'Upscale workflow.', Icon: Sparkles },
  'sdxl-cn-depth': { label: 'CN Depth', description: 'Depth ControlNet workflow.', Icon: Sparkles },
  'sdxl-outpaint': { label: 'Outpaint', description: 'Canvas extension workflow.', Icon: Sparkles },
  'sdxl-sd-image': { label: 'SD IMAGE', description: 'SDXL workflow family.', Icon: Sparkles },
  video: { label: 'Video Studio', description: 'Create and animate video sequences with WAN.', Icon: Video },
  'wan21-steady-dancer': { label: 'WAN 2.1 Steady Dancer', description: 'Reference-motion transfer.', Icon: Video },
  'wan22-vid2vid': { label: 'WAN 2.2 Vid2Vid', description: 'Extend and transform video with WAN 2.2.', Icon: Video },
  'wan22-img2vid': { label: 'WAN 2.2 Img2Vid', description: 'Animate still images.', Icon: Video },
  'wan22-img2vid-6frames': { label: 'WAN 2.2 Story (6 Frames)', description: 'Storyboard flow with WAN 2.2.', Icon: Video },
  ltx: { label: 'LTX Video', description: 'LTX video workflows.', Icon: Film },
  'ltx-flf': { label: 'LTX - First / Last Frame', description: 'Generate between keyframes.', Icon: Film },
  'ltx-img-audio': { label: 'LTX - Img + Audio Lipsync', description: 'Image + audio lipsync workflow.', Icon: Film },
  xxx: { label: 'XXX', description: 'Private workflow section.', Icon: Film },
  'xxx-influencer': { label: 'XXX Influencer', description: 'Influencer variant.', Icon: Sparkles },
  'xxx-realism-sdxl': { label: 'XXX Realism SDXL', description: 'Realism SDXL variant.', Icon: Sparkles },
  'xxx-sdxl-batch': { label: 'XXX SDXL Batch', description: 'Batch SDXL workflow.', Icon: Sparkles },
  'xxx-klein-nsfw': { label: 'XXX Klein NSFW', description: 'Klein workflow variant.', Icon: Sparkles },
  'xxx-flux': { label: 'XXX Flux', description: 'Flux workflow variant.', Icon: Sparkles },
  'xxx-wan22': { label: 'XXX WAN 2.2', description: 'WAN 2.2 variant.', Icon: Video },
  'xxx-wan-img2vid': { label: 'XXX WAN Img2Vid', description: 'WAN Img2Vid variant.', Icon: Video },
  'xxx-bouncy-walk': { label: 'XXX Bouncy Walk', description: 'Motion video workflow.', Icon: Video },
  'xxx-infinite-video': { label: 'XXX Infinite Video', description: 'Long-form video workflow.', Icon: Video },
  'xxx-blowjob-img2vid': { label: 'XXX BJ Img2Vid', description: 'Image-to-video workflow.', Icon: Video },
  'xxx-blowjob-vid2vid': { label: 'XXX BJ Vid2Vid', description: 'Video-to-video workflow.', Icon: Video },
  audio: { label: 'Audio / SFX', description: 'Generate music, voice and sound effects.', Icon: Music },
  gallery: { label: 'Gallery', description: 'Browse generated images.', Icon: Images },
  videos: { label: 'Videos', description: 'Browse generated videos.', Icon: Film },
  library: { label: 'LoRA Library', description: 'Manage installed LoRAs.', Icon: LayoutDashboard },
};

const TAB_KEY = 'fedda_v11_active_tab';

function readActiveTab(): string {
  try {
    const raw = localStorage.getItem(TAB_KEY);
    if (raw && VALID_TABS.has(raw)) return raw;
  } catch {}
  return 'chat';
}

function FeddaApp() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(readActiveTab);
  const [view, setView] = useState<'hub' | 'section' | 'workspace'>('hub');
  const [activeSection, setActiveSection] = useState<Exclude<RootSection, 'hub'> | null>(null);
  const [workspaceOrigin, setWorkspaceOrigin] = useState<'hub' | 'section'>('hub');
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const custom = event as CustomEvent<{ tab?: string }>;
      const tab = custom.detail?.tab;
      if (!tab || !VALID_TABS.has(tab)) return;
      setActiveTab(tab);
      setView('workspace');
      setWorkspaceOrigin('section');
      if (tab.startsWith('z-image') || tab.startsWith('flux') || tab.startsWith('qwen') || tab.startsWith('image-') || tab.startsWith('sdxl-')) {
        setActiveSection('image');
      } else if (tab.startsWith('xxx')) {
        setActiveSection('xxx');
      } else if (tab.startsWith('wan') || tab.startsWith('ltx') || tab === 'video') {
        setActiveSection('video');
      } else if (tab === 'gallery' || tab === 'videos' || tab === 'library') {
        setActiveSection('explore');
      } else {
        setActiveSection(null);
      }
    };
    window.addEventListener('fedda:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('fedda:navigate', onNavigate as EventListener);
  }, []);

  const meta = PAGE_META[activeTab] ?? {
    label: 'Workspace',
    description: 'Active workspace view.',
    Icon: Sparkles,
  };
  const sectionHeaderMeta: Record<Exclude<RootSection, 'hub'>, { label: string; description: string; Icon: typeof Sparkles }> = {
    image: {
      label: 'Image Studio',
      description: 'Cards navigation for image workflows.',
      Icon: Sparkles,
    },
    video: {
      label: 'Video Studio',
      description: 'Cards navigation for video workflows.',
      Icon: Video,
    },
    xxx: {
      label: 'XXX',
      description: 'Cards navigation for private workflows.',
      Icon: Film,
    },
    explore: {
      label: 'Explore',
      description: 'Cards navigation for gallery and library tools.',
      Icon: Images,
    },
  };

  const headerMeta =
    view === 'workspace'
      ? meta
      : view === 'section' && activeSection
        ? sectionHeaderMeta[activeSection]
        : {
            label: 'FEDDA v11',
            description: 'Cards-first navigation shell',
            Icon: Sparkles,
          };
  const openWorkspace = (tab: string, origin: 'hub' | 'section') => {
    if (!VALID_TABS.has(tab)) return;
    setActiveTab(tab);
    setWorkspaceOrigin(origin);
    setView('workspace');
  };

  const openSection = (section: Exclude<RootSection, 'hub'>) => {
    setActiveSection(section);
    setView('section');
  };

  const handleBack = () => {
    contentRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    if (view === 'workspace') {
      setView(workspaceOrigin === 'section' ? 'section' : 'hub');
      return;
    }
    setView('hub');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'chat':
        return <AgentChatPage />;
      case 'image':
        case 'z-image':
        case 'z-image-txt2img':
        case 'z-image-img2img':
        case 'z-image-dual-lora':
        case 'flux':
      case 'flux-txt2img':
      case 'qwen':
      case 'qwen-txt2img':
      case 'qwen-image-ref':
      case 'qwen-multi-angle':
      case 'image-other':
      case 'image-influencer':
      case 'sdxl-default':
      case 'sdxl-controlnet':
      case 'sdxl-batch-processor':
      case 'sdxl-ip-adapter-2x-img2img':
      case 'sdxl-2000px-latent-upscale':
      case 'sdxl-remove-background':
      case 'sdxl-cn-openpose':
      case 'sdxl-ip-adapter-style-transfer':
      case 'sdxl-ip-adapter-img2img':
      case 'sdxl-inpaint-pro':
      case 'sdxl-cn-canny':
      case 'sdxl-sd-upscale':
      case 'sdxl-cn-depth':
      case 'sdxl-outpaint':
      case 'sdxl-sd-image':
        return <ImageStudioPage activeTab={activeTab} />;
      case 'video':
      case 'wan21-steady-dancer':
      case 'wan22-vid2vid':
      case 'wan22-img2vid':
      case 'wan22-img2vid-6frames':
      case 'ltx':
      case 'ltx-flf':
      case 'ltx-img-audio':
        return <VideoStudioPage activeTab={activeTab} />;
      case 'xxx':
      case 'xxx-influencer':
      case 'xxx-realism-sdxl':
      case 'xxx-sdxl-batch':
      case 'xxx-klein-nsfw':
      case 'xxx-flux':
      case 'xxx-wan22':
      case 'xxx-wan-img2vid':
      case 'xxx-bouncy-walk':
      case 'xxx-infinite-video':
      case 'xxx-blowjob-img2vid':
      case 'xxx-blowjob-vid2vid':
        return <XxxStudioPage activeTab={activeTab} />;
      case 'library':
        return <LibraryPage />;
      case 'gallery':
        return <GalleryPage />;
      case 'videos':
        return <VideosPage />;
      default:
        return <PlaceholderPage label={meta.label} description={meta.description} icon={<meta.Icon className="w-8 h-8" />} />;
    }
  };

  const sectionGroups = activeSection ? TOOL_GROUPS[activeSection] : [];
  const isHubView = view === 'hub';
  const sectionTitle =
    activeSection === 'image'
      ? 'Image Studio'
      : activeSection === 'video'
        ? 'Video Studio'
        : activeSection === 'xxx'
          ? 'XXX'
          : 'Explore';

  return (
    <div className="flex h-screen theme-bg-app text-white overflow-hidden font-sans">
      {showLanding && <LandingPage onEnter={() => setShowLanding(false)} />}

      <main className="flex-1 flex flex-col overflow-hidden theme-bg-main">
        <header className="border-b border-white/10 flex flex-col backdrop-blur-md bg-black/40 shrink-0">
          {/* Row 1: Primary Navigation & Titles */}
          <div className="h-12 px-5 md:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== 'hub' && (
                <button
                  onClick={handleBack}
                  className="v11-icon-btn"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <headerMeta.Icon className="w-4 h-4 text-violet-400/80" />
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-tight text-white/90">{headerMeta.label}</p>
                {/* description hidden on small headers or moved to hover if needed, but for now we keep it clean */}
              </div>
              
            </div>
            
            <div className="flex items-center gap-4">
              {/* Logo / Branding */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-200">FEDDA v11</span>
              </div>
            </div>
          </div>

          {/* Row 2: Technical System Strip */}
          <div className="px-4 md:px-6 py-1 border-t border-white/[0.04] bg-black/20">
            <TopSystemStrip />
          </div>
        </header>

        <div ref={contentRef} className={isHubView ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto p-5 md:p-8 custom-scrollbar'}>
          {view === 'hub' && (
            <div key="hub-view" className="v11-hub-canvas animate-fade-in">
              <div className="v11-hub-row">
                {HUB_CARDS.map((card) => (
                  <StudioCard
                    key={card.label}
                    title={card.label}
                    description={card.description}
                    Icon={card.Icon}
                    image={card.image}
                    hideContent
                    onClick={() => (card.directTab ? openWorkspace(card.directTab, 'hub') : openSection(card.id as Exclude<RootSection, 'hub'>))}
                  />
                ))}
              </div>
            </div>
          )}

          {view === 'section' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
              <p className="v11-kicker">{sectionTitle}</p>
              {sectionGroups.map((group) => (
                <SectionGroup key={group.title} title={group.title}>
                  {group.tools.map((tool) => (
                    <ToolCard
                      key={tool.tab}
                      title={tool.label}
                      description={tool.description}
                      image={CARD_IMAGE_BY_TAB[tool.tab]}
                      hideContent
                      onClick={() => openWorkspace(tool.tab, 'section')}
                    />
                  ))}
                </SectionGroup>
              ))}
            </div>
          )}

          {view === 'workspace' && <div className="h-full animate-fade-in">{renderPage()}</div>}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ComfyExecutionProvider>
      <ToastProvider>
        <FeddaApp />
      </ToastProvider>
    </ComfyExecutionProvider>
  );
}
