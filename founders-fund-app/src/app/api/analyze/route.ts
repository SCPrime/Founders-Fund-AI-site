import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const promptPath = path.join(
      process.cwd(),
      "src",
      "prompts",
      "portfolio_snapshot_prompt.txt"
    );
    const prompt = await fs.readFile(promptPath, "utf8");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_base64: base64Image },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    let data;
    try {
      data = JSON.parse(response.output_text);
    } catch {
      data = response.output_text;
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Analyze API error", err);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}

