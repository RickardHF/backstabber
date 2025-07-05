// Temporary component to generate sprite sheet
'use client';

import { useState } from 'react';
import { generateSampleSpriteSheet, downloadSpriteSheet } from '../utils/generateSpriteSheet';

export default function SpriteSheetGenerator() {
  const [spriteUrl, setSpriteUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await generateSampleSpriteSheet();
      setSpriteUrl(dataUrl);
      
      // Automatically download the sprite sheet
      await downloadSpriteSheet();
    } catch (error) {
      console.error('Error generating sprite sheet:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Sprite Sheet Generator</h2>
      
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isGenerating ? 'Generating...' : 'Generate & Download Sprite Sheet'}
      </button>
      
      {spriteUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Generated Sprite Sheet:</h3>
          <img src={spriteUrl} alt="Generated sprite sheet" className="border border-gray-300 bg-gray-100" />
          <p className="text-sm text-gray-600 mt-2">
            This sprite sheet has been downloaded. Save it as 'character-sprite.png' in your public folder.
          </p>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-semibold">Instructions:</h4>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Click the button to generate and download the sprite sheet</li>
          <li>Save the downloaded file as 'character-sprite.png' in your public folder</li>
          <li>The game will automatically use the image file instead of procedural generation</li>
        </ol>
      </div>
    </div>
  );
}
