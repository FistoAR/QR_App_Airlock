import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FiUser,
  FiPhone,
  FiSmartphone,
  FiMail,
  FiBriefcase,
  FiGlobe,
  FiMapPin,
  FiLinkedin,
  FiAtSign,
} from 'react-icons/fi';

const VCardForm = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const firstName = watch('content.firstName');

  React.useEffect(() => {
    if (firstName) {
      setValue('title', firstName, { shouldValidate: true });
    }
  }, [firstName, setValue]);

  const inputClass = "w-full px-[0.75vw] py-[0.6vw] text-[0.85vw] border border-slate-200 rounded-[0.5vw] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all";
  const labelClass = "flex items-center gap-[0.4vw] text-[0.75vw] font-bold text-slate-600 mb-[0.35vw]";
  const sectionClass = "p-[1vw] bg-white border border-slate-100 rounded-[0.75vw] shadow-sm space-y-[0.75vw]";

  return (
    <div className="space-y-[1.25vw] max-w-[45vw]">
      {/* Essential Details */}
      <div className={sectionClass}>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div className="col-span-2">
            <label className={labelClass}>
              <FiUser className="text-blue-500" /> Full Name *
            </label>
            <input
              {...register('content.firstName', { required: 'Name is required' })}
              type="text"
              placeholder="e.g. John Doe"
              className={inputClass}
            />
            {errors.content?.firstName && (
              <p className="text-red-500 text-[0.65vw] mt-[0.2vw]">{errors.content.firstName.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              <FiBriefcase className="text-slate-400" /> Job Title
            </label>
            <input
              {...register('content.title')}
              type="text"
              placeholder="e.g. CEO / Manager"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <FiAtSign className="text-slate-400" /> Company
            </label>
            <input
              {...register('content.organization')}
              type="text"
              placeholder="e.g. Acme Corp"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className={sectionClass}>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div>
            <label className={labelClass}>
              <FiSmartphone className="text-emerald-500" /> Mobile Number
            </label>
            <input
              {...register('content.mobile')}
              type="tel"
              placeholder="e.g. +1 234 567 8900"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <FiPhone className="text-blue-500" /> Office Number
            </label>
            <input
              {...register('content.phone')}
              type="tel"
              placeholder="e.g. +1 987 654 3210"
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>
              <FiMail className="text-rose-500" /> Email Address *
            </label>
            <input
              {...register('content.email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              placeholder="e.g. john@company.com"
              className={inputClass}
            />
            {errors.content?.email && (
              <p className="text-red-500 text-[0.65vw] mt-[0.2vw]">{errors.content.email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Online & Location */}
      <div className={sectionClass}>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div>
            <label className={labelClass}>
              <FiGlobe className="text-sky-500" /> Website
            </label>
            <input
              {...register('content.website')}
              type="url"
              placeholder="https://www.example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <FiLinkedin className="text-blue-700" /> LinkedIn Profile
            </label>
            <input
              {...register('content.linkedin')}
              type="url"
              placeholder="linkedin.com/in/username"
              className={inputClass}
            />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>
              <FiMapPin className="text-slate-400" /> Full Address
            </label>
            <textarea
              {...register('content.address.street')}
              rows={2}
              placeholder="e.g. 123 Business Ave, Suite 400, New York, NY 10001"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </div>
 
    </div>
  );
};

export default VCardForm;