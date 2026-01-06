'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Bath, 
  Maximize2,
  ChevronDown,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';
import type { GenerationRequest } from '@/lib/types';

interface GenerationSidebarProps {
  onGenerate: (request: GenerationRequest) => void;
  isGenerating: boolean;
}

const STYLES = [
  { id: 'contemporary', name: 'Contemporary' },
  { id: 'modern', name: 'Modern' },
  { id: 'traditional', name: 'Traditional' },
  { id: 'farmhouse', name: 'Farmhouse' },
  { id: 'craftsman', name: 'Craftsman' },
  { id: 'ranch', name: 'Ranch' },
  { id: 'mediterranean', name: 'Mediterranean' },
  { id: 'minimalist', name: 'Minimalist' },
];

const ADDITIONAL_ROOMS = [
  { id: 'pool', name: 'Pool', icon: '🏊' },
  { id: 'office', name: 'Office', icon: '💼' },
  { id: 'mudroom', name: 'Mudroom', icon: '🚪' },
  { id: 'laundry', name: 'Laundry', icon: '🧺' },
  { id: 'pantry', name: 'Pantry', icon: '🍳' },
  { id: 'gym', name: 'Gym', icon: '🏋️' },
];

export function GenerationSidebar({ onGenerate, isGenerating }: GenerationSidebarProps) {
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(2000);
  const [style, setStyle] = useState('contemporary');
  const [count, setCount] = useState(6);
  const [additionalRooms, setAdditionalRooms] = useState<string[]>([]);
  const [showRooms, setShowRooms] = useState(false);

  const handleSubmit = () => {
    onGenerate({
      bedrooms,
      bathrooms,
      sqft,
      style,
      count,
      additional_rooms: additionalRooms.length > 0 ? additionalRooms : undefined,
    });
  };

  const toggleRoom = (roomId: string) => {
    setAdditionalRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(r => r !== roomId)
        : [...prev, roomId]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Style Selection */}
        <div className="p-4 border-b border-drafted-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-drafted-light uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-drafted-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              Exterior Aesthetic
            </span>
          </div>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="select-drafted"
          >
            {STYLES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Room Requirements */}
        <div className="p-4 border-b border-drafted-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-drafted-light uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 bg-drafted-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              Room Requirements
            </span>
            <button
              onClick={() => setShowRooms(!showRooms)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-drafted-bg transition-colors"
            >
              <Plus className="w-4 h-4 text-drafted-gray" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Floors (static for now) */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-drafted-gray">
                <Maximize2 className="w-4 h-4" />
                Floors
              </div>
              <span className="text-sm font-medium text-drafted-black">1 Story</span>
            </div>

            {/* Target Sqft */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-drafted-gray">
                <Home className="w-4 h-4" />
                Target Heated Sqft
              </div>
              <span className="text-sm font-medium text-drafted-black">{sqft.toLocaleString()}</span>
            </div>

            {/* Sqft Slider */}
            <input
              type="range"
              min={800}
              max={5000}
              step={100}
              value={sqft}
              onChange={(e) => setSqft(Number(e.target.value))}
              className="slider-drafted"
            />

            {/* Main Floor Rooms */}
            <div className="pt-2">
              <div className="flex items-center gap-2 text-sm text-drafted-gray mb-3">
                <ChevronDown className="w-4 h-4" />
                Main Floor
                <span className="ml-auto text-drafted-black font-medium">{bedrooms + bathrooms + 2} Rooms</span>
              </div>

              {/* Room List */}
              <div className="space-y-2 pl-6">
                {/* Primary Bedroom */}
                <RoomRow 
                  icon="🛏️" 
                  name="Primary Bedroom" 
                  count={1}
                  color="bg-room-bedroom"
                />
                
                {/* Additional Bedrooms */}
                {bedrooms > 1 && (
                  <RoomRow 
                    icon="🛏️" 
                    name="Bedroom" 
                    count={bedrooms - 1}
                    color="bg-room-bedroom"
                    onIncrement={() => setBedrooms(Math.min(5, bedrooms + 1))}
                    onDecrement={() => setBedrooms(Math.max(1, bedrooms - 1))}
                    editable
                  />
                )}
                
                {bedrooms === 1 && (
                  <button
                    onClick={() => setBedrooms(2)}
                    className="text-xs text-coral-500 hover:text-coral-600 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Bedroom
                  </button>
                )}

                {/* Bathrooms */}
                <RoomRow 
                  icon="🚿" 
                  name="Primary Bathroom" 
                  count={1}
                  color="bg-room-bathroom"
                />
                
                {bathrooms > 1 && (
                  <RoomRow 
                    icon="🚿" 
                    name="Bathroom" 
                    count={bathrooms - 1}
                    color="bg-room-bathroom"
                    onIncrement={() => setBathrooms(Math.min(4, bathrooms + 1))}
                    onDecrement={() => setBathrooms(Math.max(1, bathrooms - 1))}
                    editable
                  />
                )}

                {/* Additional Rooms */}
                {additionalRooms.map(roomId => {
                  const room = ADDITIONAL_ROOMS.find(r => r.id === roomId);
                  if (!room) return null;
                  return (
                    <RoomRow 
                      key={roomId}
                      icon={room.icon} 
                      name={room.name} 
                      count={1}
                      color="bg-room-living"
                      onRemove={() => toggleRoom(roomId)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Add Room Dropdown */}
          {showRooms && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-drafted-bg rounded-drafted"
            >
              <p className="text-xs text-drafted-gray mb-2">Add additional rooms:</p>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_ROOMS.filter(r => !additionalRooms.includes(r.id)).map(room => (
                  <button
                    key={room.id}
                    onClick={() => {
                      toggleRoom(room.id);
                      setShowRooms(false);
                    }}
                    className="room-tag room-tag-living hover:bg-room-kitchen transition-colors"
                  >
                    {room.icon} {room.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Plan Count */}
        <div className="p-4 border-b border-drafted-border">
          <span className="text-xs font-medium text-drafted-light uppercase tracking-wider mb-3 block">
            Number of Variations
          </span>
          <div className="flex gap-2">
            {[4, 6, 8, 10].map((num) => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`flex-1 py-2 rounded-drafted text-sm font-medium transition-all ${
                  count === num
                    ? 'bg-drafted-black text-white'
                    : 'bg-drafted-bg text-drafted-gray hover:bg-drafted-border'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Room Limit Indicator (matching drafted.ai) */}
        <div className="p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-drafted-gray flex items-center gap-1">
              Room List Limit
              <span className="text-drafted-light">ⓘ</span>
            </span>
            <span className="flex items-center gap-2">
              {100 - (bedrooms + bathrooms + additionalRooms.length) * 5}% Remaining
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </span>
          </div>
        </div>
      </div>

      {/* Generate Button - Fixed at bottom */}
      <div className="p-4 border-t border-drafted-border bg-white">
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          className="w-full btn-drafted-coral py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Draft
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Room Row Component
interface RoomRowProps {
  icon: string;
  name: string;
  count: number;
  color: string;
  editable?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onRemove?: () => void;
}

function RoomRow({ 
  icon, 
  name, 
  count, 
  color, 
  editable, 
  onIncrement, 
  onDecrement,
  onRemove 
}: RoomRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 ${color} rounded flex items-center justify-center text-xs`}>
          {icon}
        </span>
        <span className="text-sm text-drafted-black">
          {name}
          {count > 1 && ` × ${count}`}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {editable && (
          <>
            <button
              onClick={onDecrement}
              className="w-5 h-5 flex items-center justify-center text-drafted-gray hover:text-drafted-black opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={onIncrement}
              className="w-5 h-5 flex items-center justify-center text-drafted-gray hover:text-drafted-black opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="w-5 h-5 flex items-center justify-center text-drafted-gray hover:text-coral-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        )}
        <span className="text-xs text-drafted-light ml-1">⊗ S</span>
      </div>
    </div>
  );
}


