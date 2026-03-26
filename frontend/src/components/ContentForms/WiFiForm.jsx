import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiWifi } from 'react-icons/fi';

const WiFiForm = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const content = watch('content');

  return (
    <div className="space-y-[1vw]">
      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          <FiWifi className="inline mr-2" />
          Network Name (SSID)
        </label>
        <input
          {...register('content.ssid', {
            required: 'Network name is required',
          })}
          type="text"
          placeholder="Your WiFi network name"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
        {errors.content?.ssid && (
          <p className="text-red-500 text-[0.8vw] mt-[0.25vw]">{errors.content.ssid.message}</p>
        )}
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Password
        </label>
        <input
          {...register('content.password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password should be at least 8 characters',
            },
          })}
          type="password"
          placeholder="WiFi password"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
        {errors.content?.password && (
          <p className="text-red-500 text-[0.8vw] mt-[0.25vw]">{errors.content.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Security Type
        </label>
        <select
          {...register('content.encryption')}
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        >
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">No Password</option>
        </select>
      </div>

      <div className="flex items-center gap-[0.75vw]">
        <input
          {...register('content.hidden')}
          type="checkbox"
          id="hidden"
          className="rounded border-slate-300"
        />
        <label htmlFor="hidden" className="text-[0.9vw] text-slate-700 cursor-pointer">
          Hidden Network
        </label>
      </div>

      {typeof content?.ssid === 'string' && content.ssid && (
        <div className="p-[1vw] bg-cyan-50 border border-cyan-200 rounded-[0.5vw]">
          <p className="text-[0.85vw] text-cyan-700">
            <strong>Preview:</strong> When scanned, users can connect to WiFi network "{content.ssid}"
          </p>
        </div>
      )}
    </div>
  );
};

export default WiFiForm;
