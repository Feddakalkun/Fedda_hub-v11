import { Txt2ImgPage } from './ZImageTxt2Img';

export const ZImageImg2ImgPage = () => {
  return (
    <Txt2ImgPage
      storageKey="zimage_img2img"
      workflowId="z-image-img2img"
      familyLabel="Z-Image Img2Img"
      promptContext="zimage"
      accent="emerald"
      loraPrefixes={['zimage_turbo/', 'zimage-turbo/']}
      loraPacks={['zimage_turbo', 'zimage_nsfw']}
      requireImageUpload
      imageParamKey="image"
      imageLabel="Input Image"
      showDenoiseControl
      defaultDenoise={0.7}
    />
  );
};
