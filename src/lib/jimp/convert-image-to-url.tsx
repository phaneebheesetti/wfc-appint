import { type JimpInstance } from "jimp"

export const convertImageToUrl = async (image: JimpInstance) => {
  const buffer = await image.getBuffer("image/png")

  const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" })
  const objectUrl = URL.createObjectURL(blob)

  return objectUrl
}
