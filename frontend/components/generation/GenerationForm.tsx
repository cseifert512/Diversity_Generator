'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Home, 
  Bath, 
  Square, 
  Palette,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import type { GenerationRequest } from '@/lib/types';

interface GenerationFormProps {
  onGenerate: (request: GenerationRequest) => void;
  isGenerating: boolean;
}

const STYLES = [
  { id: 'modern', name: 'Modern', icon: '◻️' },
  { id: 'traditional', name: 'Traditional', icon: '🏛️' },
  { id: 'farmhouse', name: 'Farmhouse', icon: '🏡' },
  { id: 'craftsman', name: 'Craftsman', icon: '🔨' },
  { id: 'contemporary', name: 'Contemporary', icon: '✨' },
  { id: 'ranch', name: 'Ranch', icon: '🏠' },
  { id: 'mediterranean', name: 'Mediterranean', icon: '☀️' },
  { id: 'minimalist', name: 'Minimalist', icon: '○' },
];

const ADDITIONAL_ROOMS = [
  'Office', 'Mudroom', 'Laundry', 'Pantry', 'Bonus Room',
  'Home Theater', 'Gym', 'Guest Suite', 'Workshop', 'Playroom'
];

const COUNT_OPTIONS = [4, 6, 8, 10, 12];

export function GenerationForm({ onGenerate, isGenerating }: GenerationFormProps) {
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(2000);
  const [style, setStyle] = useState('modern');
  const [count, setCount] = useState(6);
  const [additionalRooms, setAdditionalRooms] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      bedrooms,
      bathrooms,
      sqft,
      style,
      count,
      additional_rooms: additionalRooms.length > 0 ? additionalRooms : undefined,
    });
  };

  const toggleRoom = (room: string) => {
    setAdditionalRooms(prev => 
      prev.includes(room) 
        ? prev.filter(r => r !== room)
        : [...prev, room]
    );
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="card-drafted p-8"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-coral-100 rounded-drafted flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-coral-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-drafted-black">Generate Floor Plans</h2>
          <p className="text-sm text-drafted-gray">AI-powered diverse design exploration</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Bedrooms & Bathrooms */}
        <div className="grid grid-cols-2 gap-6">
          {/* Bedrooms */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-drafted-gray mb-3">
              <Home className="w-4 h-4" />
              Bedrooms
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBedrooms(num)}
                  className={`
                    flex-1 py-2.5 rounded-drafted text-sm font-medium transition-all
                    ${bedrooms === num 
                      ? 'bg-drafted-black text-white' 
                      : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'}
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-drafted-gray mb-3">
              <Bath className="w-4 h-4" />
              Bathrooms
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBathrooms(num)}
                  className={`
                    flex-1 py-2.5 rounded-drafted text-sm font-medium transition-all
                    ${bathrooms === num 
                      ? 'bg-drafted-black text-white' 
                      : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'}
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Square Footage */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-drafted-gray mb-3">
            <span className="flex items-center gap-2">
              <Square className="w-4 h-4" />
              Square Footage
            </span>
            <span className="text-coral-500 font-semibold">{sqft.toLocaleString()} sq ft</span>
          </label>
          <input
            type="range"
            min={1000}
            max={5000}
            step={100}
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
            className="slider-drafted"
          />
          <div className="flex justify-between text-xs text-drafted-light mt-1">
            <span>1,000</span>
            <span>3,000</span>
            <span>5,000</span>
          </div>
        </div>

        {/* Style Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-drafted-gray mb-3">
            <Palette className="w-4 h-4" />
            Architectural Style
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`
                  py-3 px-2 rounded-drafted text-sm transition-all text-center
                  ${style === s.id 
                    ? 'bg-coral-50 text-coral-600 ring-2 ring-coral-500' 
                    : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'}
                `}
              >
                <span className="block text-lg mb-1">{s.icon}</span>
                <span className="font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Number of Plans */}
        <div>
          <label className="text-sm font-medium text-drafted-gray mb-3 block">
            Number of Plans to Generate
          </label>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`
                  flex-1 py-2.5 rounded-drafted text-sm font-medium transition-all
                  ${count === num 
                    ? 'bg-drafted-black text-white' 
                    : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'}
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-drafted-gray hover:text-drafted-black transition-colors"
        >
          <Plus className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-45' : ''}`} />
          {showAdvanced ? 'Hide' : 'Show'} additional rooms
        </button>

        {/* Additional Rooms */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-sm font-medium text-drafted-gray mb-3 block">
              Additional Rooms (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {ADDITIONAL_ROOMS.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => toggleRoom(room.toLowerCase())}
                  className={`
                    px-3 py-1.5 rounded-full text-sm transition-all
                    ${additionalRooms.includes(room.toLowerCase())
                      ? 'bg-coral-100 text-coral-600 ring-1 ring-coral-300' 
                      : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'}
                  `}
                >
                  {room}
                  {additionalRooms.includes(room.toLowerCase()) && (
                    <X className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full btn-drafted-coral py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating {count} Plans...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate {count} Diverse Floor Plans
            </span>
          )}
        </button>

        <p className="text-xs text-center text-drafted-light">
          Powered by Google Gemini • Each plan uses a different layout strategy
        </p>
      </div>
    </motion.form>
  );
}
