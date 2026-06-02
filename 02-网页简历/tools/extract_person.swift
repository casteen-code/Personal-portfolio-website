import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import Vision

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: extract_person.swift <input> <output>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

guard let nsImage = NSImage(contentsOf: inputURL) else {
    fputs("Could not read input image\n", stderr)
    exit(1)
}

var proposedRect = CGRect(origin: .zero, size: nsImage.size)
guard let cgImage = nsImage.cgImage(forProposedRect: &proposedRect, context: nil, hints: nil) else {
    fputs("Could not create CGImage\n", stderr)
    exit(1)
}

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
request.usesCPUOnly = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

guard let observation = request.results?.first as? VNPixelBufferObservation else {
    fputs("No person mask generated\n", stderr)
    exit(1)
}

let context = CIContext(options: [.workingColorSpace: NSNull()])
let inputImage = CIImage(cgImage: cgImage)
let maskImage = CIImage(cvPixelBuffer: observation.pixelBuffer)

let scaleX = inputImage.extent.width / maskImage.extent.width
let scaleY = inputImage.extent.height / maskImage.extent.height
let scaledMask = maskImage
    .transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
    .cropped(to: inputImage.extent)

let transparent = CIImage(color: .clear).cropped(to: inputImage.extent)
let blend = CIFilter.blendWithAlphaMask()
blend.inputImage = inputImage
blend.backgroundImage = transparent
blend.maskImage = scaledMask

guard let outputImage = blend.outputImage,
      let outputCG = context.createCGImage(outputImage, from: inputImage.extent),
      let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, "public.png" as CFString, 1, nil) else {
    fputs("Could not render output image\n", stderr)
    exit(1)
}

CGImageDestinationAddImage(destination, outputCG, nil)
guard CGImageDestinationFinalize(destination) else {
    fputs("Could not write output image\n", stderr)
    exit(1)
}
