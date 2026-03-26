import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiLink, FiGlobe, FiMapPin, FiInfo, FiType } from 'react-icons/fi';

const URLForm = () => {
  const { register, formState: { errors }, watch } = useFormContext();
  const url = watch('content.target');

  const inputClass = "w-full px-[0.75vw] py-[0.6vw] text-[0.85vw] border border-slate-200 rounded-[0.5vw] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all";
  const labelClass = "flex items-center gap-[0.4vw] text-[0.75vw] font-bold text-slate-600 mb-[0.35vw]";

  return (
    <div className="space-y-[1.25vw] max-w-[45vw]">
      {/* Primary Link */}
      <div className="p-[1vw] bg-white border border-slate-100 rounded-[0.75vw] shadow-sm space-y-[0.75vw]">
        <div>
          <label className={labelClass}>
            <FiLink className="text-blue-500" /> Website URL / Domain / Location *
          </label>
          <input
            {...register('content.target', {
              required: 'URL is required',
              pattern: {
                value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
                message: 'Please enter a valid URL'
              }
            })}
            type="url"
            placeholder="https://www.company.com"
            className={inputClass}
          />
          {errors.content?.target && (
            <p className="text-red-500 text-[0.65vw] mt-[0.2vw] flex items-center gap-[0.2vw]">
              <FiInfo /> {errors.content.target.message}
            </p>
          )}
        </div>
      </div>

      {/* URL Preview Card */}
        {typeof url === 'string' && url && (
          <div className="p-[0.75vw] bg-white rounded-[0.4vw] border border-blue-100 shadow-sm">
            <p className="text-[0.6vw] text-slate-400 font-bold uppercase tracking-wider mb-[0.2vw]">Destination Preview</p>
            <a
              href={url.startsWith('http') ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8vw] break-all font-medium text-blue-600 hover:underline"
            >
              {url}
            </a>
          </div>
        )}
    </div>
  );
};

export default URLForm;