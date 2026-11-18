import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { InfoTooltip } from "@/components/ui/tooltip"
import { useParticipantsUploadStore } from "@/stores"

import { UsersImage } from "./users-image"

interface UsersImagesProps {
  selectedFileId: string
  setSelectedFileId: (id: string) => void
  errorCountByFileId: Record<string, number>
}

export function UsersImages({ selectedFileId, setSelectedFileId, errorCountByFileId }: UsersImagesProps) {
  const files = useParticipantsUploadStore(state => state.files)
  if (!files.length) return null

  const imageFiles = files.filter(({ file }) => file.type.startsWith("image/"))
  if (!imageFiles.length) return null

  const fileIndex = imageFiles.findIndex(file => file.id === selectedFileId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className="text-2xl font-semibold">Image Preview</div>
        <div className="text-sm text-muted-foreground">Image tips for best results</div>
        <InfoTooltip
          content="Make sure your image is clear, well-lit, and taken from a straight angle. Use all capital letters and print neatly for better accuracy."
          side="top"
        />
      </div>

      <div className="flex items-center justify-center gap-2 bg-accent rounded-lg p-6 px-0 border border-border">
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {imageFiles.map(file => (
              <CarouselItem key={file.id} className="basis-[30%] pl-6">
                <UsersImage
                  key={file.id}
                  file={file}
                  isSelected={selectedFileId === file.id}
                  hasError={(errorCountByFileId?.[file.id] ?? 0) > 0}
                  setSelectedFileId={setSelectedFileId}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </div>

      <div className="bg-accent rounded-lg p-2 text-accent-foreground">
        <span className="font-semibold">Currently reviewing: </span>
        Image {fileIndex + 1} of {imageFiles.length}
      </div>
    </div>
  )
}
