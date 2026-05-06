import { useEffect, useState } from 'react';
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
import { SectionGroup, StudioCard, ToolCard } from './components/layout/V11Cards';

type RootSection = 'hub' | 'image' | 'video' | 'xxx' | 'explore';

type ToolItem = { tab: string; label: string; description: string };

const CARD_IMAGE_BY_TAB: Record<string, string> = {
  chat: '/cards/agent-chat.png',
  image: '/cards/image-studio.png',
  video: '/cards/video-studio.png',
  audio: '/cards/ltx-audio.png',
  explore: '/cards/explore.png',
  'z-image-txt2img': '/cards/txt2img.png',
  'z-image-dual-lora': '/cards/dual-lora.png',
  'z-image-img2img': '/cards/txt2img.png',
  'flux-txt2img': '/cards/flux2klein.png',
  'qwen-txt2img': '/cards/zimage.png',
  'qwen-image-ref': '/cards/image-ref.png',
  'qwen-multi-angle': '/cards/multi-angles.png',
  'image-influencer': '/cards/influencer.png',
  'wan21-steady-dancer': '/cards/wan21.png',
  'wan22-vid2vid': '/cards/wan22-vid2vid.png',
  'wan22-img2vid': '/cards/wan22-img2vid.png',
  'wan22-img2vid-6frames': '/cards/wan22-story.png',
  'ltx-flf': '/cards/ltx-flf.png',
  'ltx-img-audio': '/cards/ltx-audio.png',
  xxx: '/cards/xxx.jpg',
  gallery: '/cards/gallery.png',
  videos: '/cards/videos.png',
  library: '/cards/lora-library.png',
};

const CARD_VIDEO_BY_TAB: Record<string, string> = {
  chat: '/cards/clips/hub/agent-chat.mp4',
  image: '/cards/clips/hub/image-studio.mp4',
  video: '/cards/clips/hub/video-studio.mp4',
  audio: '/cards/clips/hub/audio-sfx.mp4',
  explore: '/cards/clips/hub/explore.mp4',
  'z-image-txt2img': '/cards/clips/tools/z-image-txt2img.mp4',
  'z-image-dual-lora': '/cards/clips/tools/z-image-dual-lora.mp4',
  'z-image-img2img': '/cards/clips/tools/z-image-txt2img.mp4',
  'flux-txt2img': '/cards/clips/tools/flux2klein-txt2img.mp4',
  'qwen-txt2img': '/cards/clips/tools/qwen-txt2img.mp4',
  'qwen-image-ref': '/cards/clips/tools/qwen-image-reference.mp4',
  'qwen-multi-angle': '/cards/clips/tools/qwen-multi-angles.mp4',
  'image-influencer': '/cards/clips/tools/influencer.mp4',
  'wan21-steady-dancer': '/cards/clips/tools/wan21-steady-dancer.mp4',
  'wan22-vid2vid': '/cards/clips/tools/wan22-vid2vid.mp4',
  'wan22-img2vid': '/cards/clips/tools/wan22-img2vid.mp4',
  'wan22-img2vid-6frames': '/cards/clips/tools/wan22-story.mp4',
  'ltx-flf': '/cards/clips/tools/ltx-first-last.mp4',
  'ltx-img-audio': '/cards/clips/tools/ltx-img-audio.mp4',
  xxx: '/cards/clips/hub/video-studio.mp4',
  gallery: '/cards/clips/tools/gallery.mp4',
  videos: '/cards/clips/tools/videos.mp4',
  library: '/cards/clips/tools/lora-library.mp4',
};

const HUB_CARDS: Array<{
  id: RootSection;
  label: string;
  description: string;
  Icon: typeof Sparkles;
  image: string;
  video?: string;
  directTab?: string;
}> = [
  {
    id: 'hub',
    label: 'Agent Chat',
    description: 'Assistant, planning and execution.',
    Icon: MessageSquare,
    image: CARD_IMAGE_BY_TAB.chat,
    video: CARD_VIDEO_BY_TAB.chat,
    directTab: 'chat',
  },
  {
    id: 'image',
    label: 'Image Studio',
    description: 'Z-Image, Qwen, FLUX and Influencer.',
    Icon: Sparkles,
    image: CARD_IMAGE_BY_TAB.image,
    video: CARD_VIDEO_BY_TAB.image,
  },
  {
    id: 'video',
    label: 'Video Studio',
    description: 'WAN and LTX pipelines.',
    Icon: Video,
    image: CARD_IMAGE_BY_TAB.video,
    video: CARD_VIDEO_BY_TAB.video,
  },
  {
    id: 'xxx',
    label: 'XXX',
    description: 'Private workflow collection.',
    Icon: Film,
    image: CARD_IMAGE_BY_TAB.xxx,
    video: CARD_VIDEO_BY_TAB.xxx,
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Gallery, videos and LoRA library.',
    Icon: Images,
    image: CARD_IMAGE_BY_TAB.explore,
    video: CARD_VIDEO_BY_TAB.explore,
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
  xxx: [],
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
  'video',
  'wan21-steady-dancer',
  'wan22-vid2vid',
  'wan22-img2vid',
  'wan22-img2vid-6frames',
  'ltx',
  'ltx-flf',
  'ltx-img-audio',
  'xxx',
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
  video: { label: 'Video Studio', description: 'Create and animate video sequences with WAN.', Icon: Video },
  'wan21-steady-dancer': { label: 'WAN 2.1 Steady Dancer', description: 'Reference-motion transfer.', Icon: Video },
  'wan22-vid2vid': { label: 'WAN 2.2 Vid2Vid', description: 'Extend and transform video with WAN 2.2.', Icon: Video },
  'wan22-img2vid': { label: 'WAN 2.2 Img2Vid', description: 'Animate still images.', Icon: Video },
  'wan22-img2vid-6frames': { label: 'WAN 2.2 Story (6 Frames)', description: 'Storyboard flow with WAN 2.2.', Icon: Video },
  ltx: { label: 'LTX Video', description: 'LTX video workflows.', Icon: Film },
  'ltx-flf': { label: 'LTX - First / Last Frame', description: 'Generate between keyframes.', Icon: Film },
  'ltx-img-audio': { label: 'LTX - Img + Audio Lipsync', description: 'Image + audio lipsync workflow.', Icon: Film },
  xxx: { label: 'XXX', description: 'Private workflow section.', Icon: Film },
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
      if (tab.startsWith('z-image') || tab.startsWith('flux') || tab.startsWith('qwen') || tab.startsWith('image-')) {
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
        return <PlaceholderPage label="XXX" description="Private workflow section." icon={<Film className="w-8 h-8" />} />;
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
                  onClick={() => {
                    if (view === 'workspace') {
                      setView(workspaceOrigin === 'section' ? 'section' : 'hub');
                    } else {
                      setView('hub');
                    }
                  }}
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

        <div className={isHubView ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto p-5 md:p-8 custom-scrollbar'}>
          {view === 'hub' && (
            <div className="v11-hub-canvas animate-fade-in">
              <div className="v11-hub-row">
                {HUB_CARDS.map((card) => (
                  <StudioCard
                    key={card.label}
                    title={card.label}
                    description={card.description}
                    Icon={card.Icon}
                    image={card.image}
                    video={card.video}
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
                      video={CARD_VIDEO_BY_TAB[tool.tab]}
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
