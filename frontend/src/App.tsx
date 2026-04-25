import { useEffect, useMemo, useState } from 'react';
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
import { SectionGroup, StudioCard, ToolCard } from './components/layout/V11Cards';

type RootSection = 'hub' | 'image' | 'video' | 'audio' | 'explore';

const HUB_CARDS: Array<{
  id: RootSection;
  label: string;
  description: string;
  Icon: typeof Sparkles;
  directTab?: string;
}> = [
  { id: 'hub', label: 'Agent Chat', description: 'Assistant, planning and execution.', Icon: MessageSquare, directTab: 'chat' },
  { id: 'image', label: 'Image Studio', description: 'Z-Image, Qwen, FLUX and Influencer.', Icon: Sparkles },
  { id: 'video', label: 'Video Studio', description: 'WAN and LTX pipelines.', Icon: Video },
  { id: 'audio', label: 'Audio / SFX', description: 'Voice and audio workflows.', Icon: Music, directTab: 'audio' },
  { id: 'explore', label: 'Explore', description: 'Gallery, videos and LoRA library.', Icon: Images },
];

const TOOL_GROUPS: Record<Exclude<RootSection, 'hub'>, Array<{ title: string; tools: Array<{ tab: string; label: string; description: string }> }>> = {
  image: [
    {
      title: 'Z-Image',
      tools: [
        { tab: 'z-image-txt2img', label: 'Txt2Img', description: 'Core Z-Image generation.' },
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
  audio: [
    {
      title: 'Audio / SFX',
      tools: [{ tab: 'audio', label: 'Audio Studio', description: 'Audio generation and voice tools.' }],
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

  const meta = PAGE_META[activeTab] ?? PAGE_META.chat;

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
      case 'library':
        return <LibraryPage />;
      default:
        return <PlaceholderPage label={meta.label} description={meta.description} icon={<meta.Icon className="w-8 h-8" />} />;
    }
  };

  const sectionGroups = activeSection ? TOOL_GROUPS[activeSection] : [];
  const sectionTitle =
    activeSection === 'image'
      ? 'Image Studio'
      : activeSection === 'video'
        ? 'Video Studio'
        : activeSection === 'audio'
          ? 'Audio / SFX'
          : 'Explore';

  return (
    <div className="flex h-screen theme-bg-app text-white overflow-hidden font-sans">
      {showLanding && <LandingPage onEnter={() => setShowLanding(false)} />}

      <main className="flex-1 flex flex-col overflow-hidden theme-bg-main">
        <header className="h-14 border-b border-white/10 px-5 md:px-6 flex items-center justify-between backdrop-blur-sm bg-black/30 shrink-0">
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
            <meta.Icon className="w-4 h-4 text-slate-400" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{view === 'hub' ? 'FEDDA v11' : meta.label}</p>
              <p className="text-[11px] text-slate-500">{view === 'hub' ? 'Cards-first navigation shell' : meta.description}</p>
            </div>
          </div>
          <TopSystemStrip />
        </header>

        <div className="flex-1 overflow-auto p-5 md:p-8 custom-scrollbar">
          {view === 'hub' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
              <section>
                <p className="v11-kicker mb-3">MAIN HUB</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {HUB_CARDS.map((card) => (
                    <StudioCard
                      key={card.label}
                      title={card.label}
                      description={card.description}
                      Icon={card.Icon}
                      onClick={() => (card.directTab ? openWorkspace(card.directTab, 'hub') : openSection(card.id as Exclude<RootSection, 'hub'>))}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}

          {view === 'section' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
              <p className="v11-kicker">{sectionTitle}</p>
              {sectionGroups.map((group) => (
                <SectionGroup key={group.title} title={group.title}>
                  {group.tools.map((tool) => (
                    <ToolCard key={tool.tab} title={tool.label} description={tool.description} onClick={() => openWorkspace(tool.tab, 'section')} />
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

