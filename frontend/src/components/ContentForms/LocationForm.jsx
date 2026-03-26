import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FiMapPin } from 'react-icons/fi';

const LocationForm = () => {
  const { register, watch, formState: { errors } } = useFormContext();
  const content = watch('content');

  return (
    <div className="space-y-[1vw]">
      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          <FiMapPin className="inline mr-2" />
          Address
        </label>
        <textarea
          {...register('content.address', {
            required: 'Address is required',
            minLength: {
              value: 5,
              message: 'Address should be at least 5 characters',
            },
          })}
          placeholder="Street address, city, state, country"
          rows="3"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw] resize-none"
        />
        {typeof errors.content?.address?.message === 'string' && (
          <p className="text-red-500 text-[0.8vw] mt-[0.25vw]">{errors.content.address.message}</p>
        )}
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Postal Code / ZIP Code (Optional)
        </label>
        <input
          {...register('content.postalCode')}
          type="text"
          placeholder="e.g., 10001"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
      </div>

      <div>
        <label className="block text-[0.9vw] font-semibold text-slate-700 mb-[0.5vw]">
          Location Name (Optional)
        </label>
        <input
          {...register('content.name')}
          type="text"
          placeholder="e.g., Times Square, New York"
          className="w-full px-[1vw] py-[0.75vw] border border-slate-300 rounded-[0.5vw] focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9vw]"
        />
      </div>

      {typeof content?.address === 'string' && content.address && (
        <div className="p-[1vw] bg-orange-50 border border-orange-200 rounded-[0.5vw]">
          <p className="text-[0.85vw] text-orange-700">
            <strong>Preview:</strong> When scanned, opens Google Maps with address "{content.address}"
            {typeof content.postalCode === 'string' && content.postalCode && ` ${content.postalCode}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationForm;
