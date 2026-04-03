import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { FiPlus, FiTrash2, FiMove, FiLink, FiInstagram, FiTwitter, FiFacebook, FiLinkedin, FiYoutube, FiGlobe } from 'react-icons/fi';

const socialPlatforms = [
  { id: 'instagram', label: 'Instagram', icon: FiInstagram, color: '#E4405F' },
  { id: 'twitter', label: 'Twitter/X', icon: FiTwitter, color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: FiFacebook, color: '#1877F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: FiLinkedin, color: '#0A66C2' },
  { id: 'youtube', label: 'YouTube', icon: FiYoutube, color: '#FF0000' },
  { id: 'website', label: 'Website', icon: FiGlobe, color: '#6366F1' },
];

const MultiLinkForm = () => {
  const { register, control, watch, formState: { errors } } = useFormContext();
  
  const { fields: linkFields, append: appendLink, remove: removeLink, move: moveLink } = useFieldArray({
    control,
    name: 'content.links',
  });

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control,
    name: 'content.socialLinks',
  });

  const inputClass = "w-full px-[0.6vw] py-[0.5vw] text-[0.8vw] border border-slate-200 rounded-[0.3vw] focus:outline-none" + " [&:focus]:ring-2" + " [&:focus]:ring-[#2563eb]";
  const labelClass = "block text-[0.7vw] font-medium text-slate-600 mb-[0.2vw]";

  return (
    <div className="space-y-[1vw]">
      {/* Profile Section */}
      <div className="p-[0.75vw] bg-slate-50 rounded-[0.5vw]">
        <h5 className="text-[0.85vw] font-semibold text-slate-800 mb-[0.75vw]">Profile</h5>
        <div className="grid grid-cols-2 gap-[0.75vw]">
          <div className="col-span-2">
            <label className={labelClass}>Page Title *</label>
            <input
              {...register('content.title', { required: 'Title is required' })}
              type="text"
              placeholder="My Link Page"
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              {...register('content.description')}
              rows={2}
              placeholder="A brief description about you or your brand"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Avatar URL</label>
            <input
              {...register('content.avatar')}
              type="text"
              placeholder="e.g. www.example.com/avatar.jpg"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Background Color</label>
            <div className="flex items-center gap-[0.5vw]">
              <input
                {...register('content.backgroundColor')}
                type="color"
                defaultValue="#f3f4f6"
                className="w-[2vw] h-[2vw] rounded cursor-pointer border border-slate-200"
              />
              <input
                {...register('content.backgroundColor')}
                type="text"
                placeholder="#f3f4f6"
                className={`flex-1 ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Links Section */}
      <div className="p-[0.75vw] bg-slate-50 rounded-[0.5vw]">
        <div className="flex items-center justify-between mb-[0.75vw]">
          <h5 className="text-[0.85vw] font-semibold text-slate-800">Links</h5>
          <button
            type="button"
            onClick={() => appendLink({ title: '', url: '', backgroundColor: '#3b82f6', textColor: '#ffffff', order: linkFields.length })}
            className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.3vw] text-[0.75vw] rounded-[0.3vw] transition-colors"
            style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}
          >
            <FiPlus className="text-[0.9vw]" />
            Add Link
          </button>
        </div>

        {linkFields.length === 0 ? (
          <div className="text-center py-[1.5vw] text-slate-400">
            <FiLink className="mx-auto text-[1.5vw] mb-[0.5vw]" />
            <p className="text-[0.8vw]">No links added yet</p>
            <p className="text-[0.7vw]">Click "Add Link" to get started</p>
          </div>
        ) : (
          <div className="space-y-[0.5vw]">
            {linkFields.map((field, index) => (
              <div
                key={field.id}
                className="p-[0.6vw] bg-white rounded-[0.4vw] border border-slate-200"
              >
                <div className="flex items-start gap-[0.5vw]">
                  <button
                    type="button"
                    className="p-[0.3vw] text-slate-400 hover:text-slate-600 cursor-grab"
                  >
                    <FiMove className="text-[0.9vw]" />
                  </button>
                  
                  <div className="flex-1 grid grid-cols-2 gap-[0.5vw]">
                    <div>
                      <input
                        {...register(`content.links.${index}.title`, { required: true })}
                        type="text"
                        placeholder="Link Title"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <input
                        {...register(`content.links.${index}.url`, { required: true })}
                        type="text"
                        placeholder="e.g. www.fist-o.com"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-center gap-[0.3vw]">
                      <label className="text-[0.65vw] text-slate-500">BG:</label>
                      <input
                        {...register(`content.links.${index}.backgroundColor`)}
                        type="color"
                        defaultValue="#3b82f6"
                        className="w-[1.5vw] h-[1.5vw] rounded cursor-pointer border border-slate-200"
                      />
                      <label className="text-[0.65vw] text-slate-500 ml-[0.3vw]">Text:</label>
                      <input
                        {...register(`content.links.${index}.textColor`)}
                        type="color"
                        defaultValue="#ffffff"
                        className="w-[1.5vw] h-[1.5vw] rounded cursor-pointer border border-slate-200"
                      />
                    </div>
                    <div>
                      <input
                        {...register(`content.links.${index}.icon`)}
                        type="text"
                        placeholder="Icon URL (optional)"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="p-[0.3vw] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 className="text-[0.9vw]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Links Section */}
      <div className="p-[0.75vw] bg-slate-50 rounded-[0.5vw]">
        <div className="flex items-center justify-between mb-[0.75vw]">
          <h5 className="text-[0.85vw] font-semibold text-slate-800">Social Links</h5>
        </div>

        <div className="grid grid-cols-3 gap-[0.5vw] mb-[0.75vw]">
          {socialPlatforms.map((platform) => {
            const isAdded = socialFields.some(f => f.platform === platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                disabled={isAdded}
                onClick={() => appendSocial({ platform: platform.id, url: '' })}
                className={`
                  flex items-center gap-[0.4vw] p-[0.5vw] rounded-[0.3vw] text-[0.75vw] transition-all
                  ${isAdded 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-700'
                  }
                `}
              >
                <platform.icon className="text-[1vw]" style={{ color: isAdded ? undefined : platform.color }} />
                {platform.label}
              </button>
            );
          })}
        </div>

        {socialFields.length > 0 && (
          <div className="space-y-[0.4vw]">
            {socialFields.map((field, index) => {
              const platform = socialPlatforms.find(p => p.id === field.platform);
              const Icon = platform?.icon || FiGlobe;
              
              return (
                <div key={field.id} className="flex items-center gap-[0.5vw]">
                  <div
                    className="w-[2vw] h-[2vw] rounded-[0.3vw] flex items-center justify-center"
                    style={{ backgroundColor: platform?.color + '20' }}
                  >
                    <Icon className="text-[1vw]" style={{ color: platform?.color }} />
                  </div>
                  <input
                    {...register(`content.socialLinks.${index}.url`, { required: true })}
                    type="text"
                    placeholder={`e.g. www.linkedin.com/in/username`}
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSocial(index)}
                    className="p-[0.3vw] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 className="text-[0.9vw]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-[0.75vw] bg-blue-50 rounded-[0.4vw] border border-blue-200">
        <p className="text-[0.75vw] text-blue-700">
          <strong>Tip:</strong> Multi-link QR codes are perfect for social media bios, business cards, or anywhere you need to share multiple links in one place.
        </p>
      </div>
    </div>
  );
};

export default MultiLinkForm;