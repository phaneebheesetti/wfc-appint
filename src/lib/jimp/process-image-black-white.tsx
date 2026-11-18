import { Jimp, type JimpInstance } from "jimp"

import { convertImageToUrl } from "./convert-image-to-url"

export const processImageBlackWhite = async (imageBuffer: ArrayBuffer) => {
  const processedImage = (await Jimp.read(Buffer.from(imageBuffer))).clone()

  processedImage.greyscale().contrast(0.1)

  const objectUrl = await convertImageToUrl(processedImage as JimpInstance)

  return { processedImage, objectUrl }
}
