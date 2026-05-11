import { ZImageTxt2Img } from './zimage/ZImageTxt2Img';
import { Sparkles } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';
import { FluxTxt2Img } from './flux/FluxTxt2Img';
import { QwenTxt2Img } from './qwen/QwenTxt2Img';
import { QwenImageReferencePage } from './qwen/QwenImageReferencePage';
import { QwenMultiAnglesPage } from './qwen/QwenMultiAnglesPage';
import { ZImageDualLoraPage } from './zimage/ZImageDualLoraPage';
import { InfluencerPage } from './influencer/InfluencerPage';
import { ZImageImg2ImgPage } from './zimage/ZImageImg2ImgPage';
import { Txt2ImgPage } from './zimage/ZImageTxt2Img';

interface ImageStudioPageProps {
  activeTab?: string;
}

export const ImageStudioPage = ({ activeTab = 'z-image' }: ImageStudioPageProps) => {
  // If the user clicks the "Image Studio" parent icon or its "z-image" subitem
  if (activeTab === 'image' || activeTab === 'z-image' || activeTab === 'z-image-txt2img') {
    return <ZImageTxt2Img />;
  }

  if (activeTab === 'z-image-dual-lora') {
    return <ZImageDualLoraPage />;
  }

  if (activeTab === 'z-image-img2img') {
    return <ZImageImg2ImgPage />;
  }

  // Placeholder for the other sub-tabs we haven't implemented yet
  if (activeTab === 'flux' || activeTab === 'flux-txt2img') {
    return <FluxTxt2Img />;
  }

  if (activeTab === 'qwen' || activeTab === 'qwen-txt2img') {
    return <QwenTxt2Img />;
  }

  if (activeTab === 'qwen-image-ref') {
    return <QwenImageReferencePage />;
  }

  if (activeTab === 'qwen-multi-angle') {
    return <QwenMultiAnglesPage />;
  }

  if (activeTab === 'image-other') {
    return <PlaceholderPage label="Other Workflows" description="Uncategorized image processing capabilities coming soon." icon={<Sparkles className="w-8 h-8" />} />;
  }

  if (activeTab === 'image-influencer') {
    return <InfluencerPage />;
  }

  if (activeTab === 'sdxl-sd-image' || activeTab === 'sdxl-default') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-default"
        workflowId="sdxl-default"
        familyLabel="SD IMAGE / DEFAULT SDXL"
        promptContext="zimage"
        accent="violet"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-controlnet' || activeTab === 'sdxl-cn-canny') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-cn-canny"
        workflowId="sdxl-cn-canny"
        familyLabel="SD IMAGE / CN CANNY"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Control Image"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-cn-openpose') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-cn-openpose"
        workflowId="sdxl-cn-openpose"
        familyLabel="SD IMAGE / CN OPENPOSE"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Pose Reference"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-cn-depth') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-cn-depth"
        workflowId="sdxl-cn-depth"
        familyLabel="SD IMAGE / CN DEPTH"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Depth Reference"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-inpaint-pro') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-inpaint-pro"
        workflowId="sdxl-inpaint-pro"
        familyLabel="SD IMAGE / INPAINT PRO"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Image To Inpaint"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-outpaint') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-outpaint"
        workflowId="sdxl-outpaint"
        familyLabel="SD IMAGE / OUTPAINT"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Image To Outpaint"
        showDenoiseControl
        defaultDenoise={1.0}
        allowEmptyPrompt
        hideLoraSection
        outpaintMode
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-ip-adapter-style-transfer') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-ip-adapter-style-transfer"
        workflowId="sdxl-ip-adapter-style-transfer"
        familyLabel="SD IMAGE / IP ADAPTER STYLE TRANSFER"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Style Reference"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-ip-adapter-img2img') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-ip-adapter-img2img"
        workflowId="sdxl-ip-adapter-img2img"
        familyLabel="SD IMAGE / IP ADAPTER IMG2IMG"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Reference Image"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-ip-adapter-2x-img2img') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-ip-adapter-2x-img2img"
        workflowId="sdxl-ip-adapter-2x-img2img"
        familyLabel="SD IMAGE / IP ADAPTER 2X IMG2IMG"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Reference Image"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-2000px-latent-upscale') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-2000px-latent-upscale"
        workflowId="sdxl-2000px-latent-upscale"
        familyLabel="SD IMAGE / 2000PX LATENT UPSCALE"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Image To Upscale"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-sd-upscale') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-sd-upscale"
        workflowId="sdxl-sd-upscale"
        familyLabel="SD IMAGE / SD UPSCALE"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Image To Upscale"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-remove-background') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-remove-background"
        workflowId="sdxl-remove-background"
        familyLabel="SD IMAGE / REMOVE BG"
        promptContext="zimage"
        accent="violet"
        requireImageUpload
        imageParamKey="image"
        imageLabel="Image"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  if (activeTab === 'sdxl-batch-processor') {
    return (
      <Txt2ImgPage
        storageKey="sdxl-batch-processor"
        workflowId="sdxl-batch-processor"
        familyLabel="SD IMAGE / BATCH PROCESSOR"
        promptContext="zimage"
        accent="violet"
        loraPrefixes={[]}
        loraPacks={[]}
      />
    );
  }

  return <ZImageTxt2Img />; // Fallback
};
