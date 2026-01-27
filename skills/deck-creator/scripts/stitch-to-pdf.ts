import { PDFDocument } from 'pdf-lib'
import { readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

// Detect image type from magic bytes
function detectImageType(bytes: Uint8Array): 'png' | 'jpeg' | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png'
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg'
  }
  return null
}

async function stitchSlidesToPDF(slidesDir: string, outputPath: string) {
  const pdfDoc = await PDFDocument.create()

  // Get sorted slide files (support both .png and .jpg extensions)
  const files = await readdir(slidesDir)
  const imageFiles = files
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
    .sort((a, b) => {
      const numA = parseInt(a.split('-')[0])
      const numB = parseInt(b.split('-')[0])
      return numA - numB
    })

  if (imageFiles.length === 0) {
    console.error('No image files found in', slidesDir)
    process.exit(1)
  }

  // Add each slide as a page
  for (const file of imageFiles) {
    const imagePath = join(slidesDir, file)
    const imageBytes = await readFile(imagePath)

    // Detect actual image type from magic bytes (not file extension)
    const imageType = detectImageType(new Uint8Array(imageBytes))

    if (!imageType) {
      console.error(`Unsupported image format: ${file}`)
      continue
    }

    const image = imageType === 'png'
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes)

    // Create page matching image dimensions
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save()
  await writeFile(outputPath, pdfBytes)

  console.log(`Created ${outputPath} with ${imageFiles.length} slides`)
}

// CLI usage
const [slidesDir, outputPath] = process.argv.slice(2)
if (!slidesDir || !outputPath) {
  console.log('Usage: bun run stitch-to-pdf.ts <slides-dir> <output.pdf>')
  process.exit(1)
}

stitchSlidesToPDF(slidesDir, outputPath)
