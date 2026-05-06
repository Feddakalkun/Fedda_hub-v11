import { Sparkles } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';
import { Txt2ImgPage } from './zimage/ZImageTxt2Img';
import { InfluencerPage } from './influencer/InfluencerPage';

interface XxxStudioPageProps {
  activeTab?: string;
}

export const XxxStudioPage = ({ activeTab = 'xxx' }: XxxStudioPageProps) => {
  if (activeTab === 'xxx' || activeTab === 'xxx-influencer') {
    return <InfluencerPage />;
  }

  if (activeTab === 'xxx-realism-sdxl') {
    return (
      <Txt2ImgPage
        storageKey="xxx-realism-sdxl"
        workflowId="xxx-realism-sdxl"
        familyLabel="XXX / REALISM SDXL"
        promptContext="zimage"
        accent="violet"
      />
    );
  }

  if (activeTab === 'xxx-sdxl-batch') {
    return (
      <Txt2ImgPage
        storageKey="xxx-sdxl-batch"
        workflowId="xxx-sdxl-batch"
        familyLabel="XXX / SDXL BATCH"
        promptContext="zimage"
        accent="violet"
      />
    );
  }

  if (activeTab === 'xxx-klein-nsfw') {
    return (
      <Txt2ImgPage
        storageKey="xxx-klein-nsfw"
        workflowId="xxx-klein-nsfw"
        familyLabel="XXX / KLEIN"
        promptContext="zimage"
        accent="violet"
      />
    );
  }

  if (activeTab === 'xxx-flux') {
    return (
      <Txt2ImgPage
        storageKey="xxx-flux"
        workflowId="xxx-flux"
        familyLabel="XXX / FLUX"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Source Image"
      />
    );
  }

  if (
    activeTab === 'xxx-wan22' ||
    activeTab === 'xxx-wan-img2vid' ||
    activeTab === 'xxx-bouncy-walk' ||
    activeTab === 'xxx-infinite-video' ||
    activeTab === 'xxx-blowjob-img2vid' ||
    activeTab === 'xxx-blowjob-vid2vid'
  ) {
    return (
      <PlaceholderPage
        label="XXX Video Workflow"
        description="This workflow card is wired in UI. Dedicated video input panel comes next."
        icon={<Sparkles className="w-8 h-8" />}
      />
    );
  }

  return (
    <PlaceholderPage
      label="XXX"
      description="XXX workflows section."
      icon={<Sparkles className="w-8 h-8" />}
    />
  );
};

