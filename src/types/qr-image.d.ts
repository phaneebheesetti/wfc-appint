declare module "qr-image" {
  interface QROptions {
    /** Output type - defaults to 'png' if not specified */
    type?: "png" | "svg" | "pdf" | "eps" | "svgpath"
    /** Error correction level - defaults to 'M' */
    ec_level?: "L" | "M" | "Q" | "H"
    /** Parse URLs in the input text (default: false) */
    parse_url?: boolean
    /** Size of a module in pixels (for png) or units (for svg) - defaults to 5 for png */
    size?: number
    /** White margin around the QR code in modules - defaults to 4 for png, 1 for vector */
    margin?: number
    /** Custom function to modify the bitmap before PNG generation (png only) */
    customize?: (bitmap: boolean[][]) => void
  }

  interface SVGObject {
    size: number
    path: string
  }

  /** Generate QR code matrix */
  function matrix(text: string, ec_level?: string, parse_url?: boolean): boolean[][]

  /** Generate QR code as a readable stream */
  function image(text: string, options?: QROptions | string): NodeJS.ReadableStream

  /** Generate QR code synchronously */
  function imageSync(text: string, options?: QROptions | string): Buffer

  /** Generate SVG object containing path and size */
  function svgObject(text: string, options?: Omit<QROptions, "type">): SVGObject

  export = {
    matrix,
    image,
    imageSync,
    svgObject,
  }
}
