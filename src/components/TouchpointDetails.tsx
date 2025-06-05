'use client';

import { useState } from 'react';

interface Touchpoint {
  id: string;
  title: string;
  description: string;
  emotion: 'positive' | 'neutral' | 'negative';
  intensity: number; // 1-10 scale for emotion intensity
  xPosition: number;
}

interface TouchpointDetailsProps {
  touchpoints: Touchpoint[];
  selectedTouchpoint?: Touchpoint;
  onUpdateTouchpoint?: (touchpoint: Touchpoint) => void;
  onDeleteTouchpoint?: (id: string) => void;
}

export default function TouchpointDetails({ 
  touchpoints, 
  selectedTouchpoint, 
  onUpdateTouchpoint,
  onDeleteTouchpoint 
}: TouchpointDetailsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Touchpoint>>({});

  const handleEdit = (touchpoint: Touchpoint) => {
    setEditingId(touchpoint.id);
    setFormData(touchpoint);
  };

  const handleSave = () => {
    if (editingId && onUpdateTouchpoint) {
      onUpdateTouchpoint(formData as Touchpoint);
      setEditingId(null);
      setFormData({});
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const getEmotionLabel = (emotion: string) => {
    switch (emotion) {
      case 'positive': return '😊 Positive';
      case 'negative': return '😞 Negative';
      default: return '😐 Neutral';
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'positive': return 'bg-green-50 border-green-200';
      case 'negative': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Touchpoint Details</h3>
      
      {touchpoints.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No touchpoints yet. Double-click on the journey path above to add your first touchpoint.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {touchpoints
            .sort((a, b) => a.xPosition - b.xPosition)
            .map((touchpoint, index) => (
              <div
                key={touchpoint.id}
                id={`touchpoint-${touchpoint.id}`}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedTouchpoint?.id === touchpoint.id
                    ? 'border-blue-300 bg-blue-50'
                    : getEmotionColor(touchpoint.emotion)
                }`}
              >
                {editingId === touchpoint.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Emotion
                        </label>
                        <select
                          value={formData.emotion || 'neutral'}
                          onChange={(e) => setFormData({ ...formData, emotion: e.target.value as 'positive' | 'neutral' | 'negative' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="positive">😊 Positive</option>
                          <option value="neutral">😐 Neutral</option>
                          <option value="negative">😞 Negative</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intensity (1-10)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={formData.intensity || 5}
                          onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-gray-500 mt-1">
                          {formData.intensity || 5}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{touchpoint.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {getEmotionLabel(touchpoint.emotion)}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Intensity: {touchpoint.intensity}/10
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-3 sm:space-x-2">
                        <button
                          onClick={() => handleEdit(touchpoint)}
                          className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteTouchpoint?.(touchpoint.id)}
                          className="text-sm text-red-600 hover:text-red-800 px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{touchpoint.description}</p>
                    <div className="mt-3 text-xs text-gray-500">
                      Step {index + 1} of {touchpoints.length}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}