import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../components/UI/Toast';
import { useConfirm } from '../../components/UI/ConfirmDialog';

import {
  FiLink,
  FiUser,
  FiFileText,
  FiUpload,
  FiList,
  FiWifi,
  FiMail,
  FiMessageSquare,
  FiMapPin,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiActivity,
} from 'react-icons/fi';

import QRPreview from './QRPreview';
import QRCustomizer from './QRCustomizer';
import URLForm from '../ContentForms/URLForm';
import VCardForm from '../ContentForms/VCardForm';
import TextForm from '../ContentForms/TextForm';
import FileUploadForm from '../ContentForms/FileUploadForm';
import MultiLinkForm from '../ContentForms/MultiLinkForm';
import EmailForm from '../ContentForms/EmailForm';
import SMSForm from '../ContentForms/SMSForm';
import WiFiForm from '../ContentForms/WiFiForm';
import LocationForm from '../ContentForms/LocationForm';
import { qrCodeAPI } from '../../services/api';

const contentTypes = [
  { id: 'url', label: 'URL', icon: FiLink, color: 'bg-blue-600', info: 'Website URL, Domain, Location' },
  { id: 'vcard', label: 'Contact', icon: FiUser, color: 'bg-emerald-600', info: 'Contact details' },
  { id: 'document', label: 'Documents', icon: FiFileText, color: 'bg-indigo-600', info: 'PPT, Doc, Word, etc.' },
  { id: 'media', label: 'Images / Videos', icon: FiUpload, color: 'bg-rose-600', info: 'High-res photos & movies' },
];

const steps = [
  { id: 1, title: 'Select Type', description: 'Choose QR format' },
  { id: 2, title: 'Details', description: 'Enter information' },
  { id: 3, title: 'Customize', description: 'Design aesthetics' },
  { id: 4, title: 'Preview', description: 'Finalize & Create' },
];

const qrSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  type: z.string(),
  isDynamic: z.boolean(),
  content: z.any(),
  customization: z.object({
    foregroundColor: z.string(),
    backgroundColor: z.string(),
    dotStyle: z.string(),
    cornerStyle: z.string(),
    errorCorrectionLevel: z.string(),
    margin: z.number(),
    logo: z.object({
      url: z.string().optional(),
      size: z.number(),
      backgroundColor: z.string().optional(),
      borderColor: z.string().optional(),
    }).optional(),
    frame: z.object({
      style: z.string(),
      text: z.string().optional(),
      topText: z.string().optional(),
      bottomText: z.string().optional(),
      textColor: z.string().optional(),
      borderColor: z.string().optional(),
      backgroundColor: z.string().optional(),
    }).optional(),
  }),
});

const QRCreator = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm({
    resolver: zodResolver(qrSchema),
    defaultValues: {
      title: '',
      description: '',
      type: '',
      isDynamic: true,
      content: {},
      customization: {
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
        dotStyle: 'square',
        cornerStyle: 'square',
        errorCorrectionLevel: 'H',
        margin: 4,
        logo: { url: '', size: 0.25, backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
        frame: { style: 'none', text: '', topText: '', bottomText: '', textColor: '#FFFFFF', borderColor: '#000000', backgroundColor: '#FFFFFF' },
      },

    },
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = methods;
  const formData = watch();

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setValue('type', type.id);
    
    // For Contact details (vcard), default to static QR (offline capable)
    // For others (URL, Documents, Media), force dynamic QR
    if (type.id === 'vcard') {
      setValue('isDynamic', false);
      // Clear title so it can be set from contact name later
      setValue('title', '');
    } else {
      setValue('isDynamic', true);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!selectedType) {
        toast.error('Please select a QR code type');
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.title) {
        toast.error('Title is required');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = async () => {
    if (currentStep === 2) {
      // Check if there's any content worth warning about
      const hasContent = formData.title || (formData.content && Object.keys(formData.content).length > 0);
      if (hasContent) {
        const ok = await confirm({
          title: 'Discard basic information?',
          message: 'Going back will clear the information you just entered for this QR code type.',
          confirmText: 'Yes, Discard',
          cancelText: 'Stay Here',
          variant: 'danger',
        });
        if (!ok) return;
      }
      // Clear content when going back from 2 to 1 (changing type)
      setValue('content', {});
      setValue('title', '');
      setSelectedType(null);
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting QR Code with data:', data);
      const response = await qrCodeAPI.create(data);
      console.log('Backend response:', response.data);
      toast.success('QR code created successfully!');
      navigate(`/qrcodes/${response.data.data._id}`);
    } catch (error) {
      console.error('QR Creation error:', error.response?.data || error.message);
      console.error('Full error object:', error);
      toast.error(error.response?.data?.message || 'Failed to create QR code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onValidationError = (errors) => {
    console.error('Validation errors:', errors);
    const firstError = Object.values(errors)[0];
    const msg = firstError?.message || 'Please fill in all required fields';
    toast.error(msg);
  };

  const renderContentForm = () => {
    switch (selectedType?.id) {
      case 'url':
        return <URLForm />;
      case 'vcard':
        return <VCardForm />;
      case 'document':
      case 'media':
        return <FileUploadForm type={selectedType.id} />;
      default:
        return <URLForm />;
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="grid grid-cols-12 gap-[1.2vw] h-[calc(100vh-7vw)] overflow-hidden">
        {/* Left Panel - Form */}
        <div className="col-span-7 bg-white rounded-[0.75vw] shadow-sm overflow-hidden flex flex-col">
          {/* Step Indicator */}
          <div className="p-[1.25vw] border-b border-slate-200">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center gap-[0.6vw] cursor-pointer transition-all ${currentStep >= step.id ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  >
                    <div
                      className="w-[2.2vw] h-[2.2vw] rounded-full flex items-center justify-center text-[0.85vw] font-black transition-all"
                      style={{
                        backgroundColor: currentStep > step.id ? '#2563eb' : currentStep === step.id ? '#eff6ff' : '#f1f5f9',
                        color: currentStep > step.id ? 'white' : currentStep === step.id ? '#2563eb' : '#94a3b8',
                        boxShadow: currentStep === step.id ? '0 0 0 2px #2563eb' : 'none',
                      }}
                    >
                      {currentStep > step.id ? <FiCheck className="text-[1vw]" /> : step.id}
                    </div>
                    <div className="hidden lg:block">
                      <p className={`text-[0.8vw] font-bold ${currentStep >= step.id ? 'text-slate-800' : 'text-slate-500'}`}>{step.title}</p>
                      <p className="text-[0.65vw] text-slate-400 font-medium">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-[0.75vw] ${currentStep > step.id ? '' : 'bg-slate-200'}`} style={currentStep > step.id ? { backgroundColor: '#2563eb' } : {}} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[1.5vw]">
            <AnimatePresence mode="wait">
              {/* Stage 1: Content Setup */}
              {currentStep === 1 && (
                <motion.div
                  key="stage1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[1.5vw]"
                >
                  <section>
                    <h3 className="text-[1vw] font-bold text-slate-800 mb-[1vw]">1. Select QR Type</h3>
                    <div className="grid grid-cols-2 gap-[1vw]">
                      {contentTypes.map((type) => (
                         <button
                           key={type.id}
                           type="button"
                           onClick={() => handleTypeSelect(type)}
                           onDoubleClick={() => {
                             handleTypeSelect(type);
                             nextStep();
                           }}
                           className="p-[1.25vw] rounded-[1vw] border-2 text-left transition-all group relative overflow-hidden h-[7vw] flex items-center gap-[1vw]"
                           style={{
                             borderColor: selectedType?.id === type.id ? (type.id === 'url' ? '#3b82f6' : type.id === 'vcard' ? '#10b981' : type.id === 'document' ? '#4f46e5' : '#e11d48') : '#f1f5f9',
                             backgroundColor: selectedType?.id === type.id ? '#fcfcfd' : '#f8fafc',
                             boxShadow: selectedType?.id === type.id ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : 'none',
                           }}
                         >
                           <div className={`w-[3vw] h-[3vw] ${type.color} rounded-[0.75vw] flex items-center justify-center shadow-sm shrink-0`}>
                             <type.icon className="text-white text-[1.4vw]" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <span className="text-[0.9vw] font-black text-slate-800 block mb-[0.1vw]">{type.label}</span>
                             <span className="text-[0.65vw] text-slate-500 font-medium leading-[0.8vw] block">{type.info}</span>
                           </div>
                           {selectedType?.id === type.id && (
                             <div className="absolute top-[0.6vw] right-[0.6vw] text-slate-400">
                               <FiCheck className="text-[1.2vw] text-blue-600" />
                             </div>
                           )}
                         </button>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Stage 2: Details Setup */}
              {currentStep === 2 && (
                <motion.div
                  key="stage2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[1.5vw]"
                >
                  <section className="space-y-[1.25vw]">
                    <h3 className="text-[1vw] font-bold text-slate-800">2. Enter Information for {selectedType?.label}</h3>
                    <div className="grid grid-cols-2 gap-[1.25vw]">
                      {selectedType?.id !== 'vcard' && (
                        <div>
                          <label className="block text-[0.8vw] font-medium text-slate-600 mb-[0.4vw]">
                            {selectedType?.id === 'url' ? 'URL Name *' : 
                             selectedType?.id === 'document' ? 'Document Name *' :
                             selectedType?.id === 'media' ? 'File Name *' : 'Project Name / Title *'}
                          </label>
                          <input
                            {...methods.register('title')}
                            className="w-full px-[0.75vw] py-[0.7vw] text-[0.85vw] border border-slate-200 rounded-[0.5vw] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            placeholder={
                              selectedType?.id === 'url' ? "e.g. My Website QR" :
                              selectedType?.id === 'document' ? "e.g. Company Brochure" :
                              selectedType?.id === 'media' ? "e.g. Event Video" : "e.g. My QR Code"
                            }
                          />
                        </div>
                      )}
                      <div className="flex items-end pb-[0.5vw]">
                        {['text', 'vcard', 'email', 'sms'].includes(selectedType?.id) && (
                          <label className="flex items-center gap-[0.75vw] p-[0.75vw] bg-slate-50 border border-slate-200 rounded-[0.5vw] cursor-pointer hover:bg-slate-100 transition-colors flex-1">
                            <input
                              type="checkbox"
                              {...methods.register('isDynamic')}
                              className="w-[1vw] h-[1vw] rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-[0.8vw] font-bold text-slate-700 leading-none">Dynamic QR</p>
                              <p className="text-[0.65vw] text-slate-500 mt-[0.2vw]">Editable & Trackable</p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="mt-[0.5vw]">
                      {renderContentForm()}
                    </div>
                  </section>
                </motion.div>
              )}

              {/* Stage 3: Aesthetic Design */}
              {currentStep === 3 && (
                <motion.div
                  key="stage3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <QRCustomizer />
                </motion.div>
              )}

              {/* Stage 4: Review & Finalize */}
              {currentStep === 4 && (
                <motion.div
                  key="stage4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-[1.5vw]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[1vw] font-bold text-slate-800">Review & Finalize</h3>
                    <span className={`px-[0.75vw] py-[0.25vw] rounded-full text-[0.7vw] font-bold uppercase tracking-wider ${formData.isDynamic ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {formData.isDynamic ? 'Dynamic QR' : 'Static QR'}
                    </span>
                  </div>

                  {/* QR Meta */}
                  <div className="bg-white border border-slate-200 rounded-[0.75vw] p-[1.25vw] space-y-[0.75vw]">
                    <div>
                      <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.2vw]">QR Name</p>
                      <p className="text-[0.95vw] font-bold text-slate-800">{formData.title || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.2vw]">Type</p>
                      <p className="text-[0.85vw] font-semibold text-slate-700 uppercase">{selectedType?.label}</p>
                    </div>
                  </div>

                  {/* Type-specific Content Summary */}
                  <div className="bg-white border border-slate-200 rounded-[0.75vw] p-[1.25vw]">
                    <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.75vw]">Content Details</p>
                    <div className="space-y-[0.6vw]">
                      {selectedType?.id === 'url' && (
                        <div className="flex flex-col">
                          <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Destination URL</span>
                          <a
                            href={formData.content?.target?.startsWith('http') ? formData.content.target : `https://${formData.content?.target}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[0.85vw] text-blue-600 font-medium break-all hover:underline"
                          >
                            {formData.content?.target || '—'}
                          </a>
                        </div>
                      )}
                      {selectedType?.id === 'vcard' && (
                        <>
                          {formData.content?.firstName && (
                            <div className="flex flex-col">
                              <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Name</span>
                              <span className="text-[0.85vw] text-slate-800 font-medium">{formData.content.firstName} {formData.content.lastName}</span>
                            </div>
                          )}
                          {formData.content?.organization && (
                            <div className="flex flex-col">
                              <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Organization</span>
                              <span className="text-[0.85vw] text-slate-800 font-medium">{formData.content.organization}</span>
                            </div>
                          )}
                          {formData.content?.mobile && (
                            <div className="flex flex-col">
                              <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Mobile</span>
                              <span className="text-[0.85vw] text-slate-800 font-medium">{formData.content.mobile}</span>
                            </div>
                          )}
                          {formData.content?.email && (
                            <div className="flex flex-col">
                              <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Email</span>
                              <span className="text-[0.85vw] text-slate-800 font-medium">{formData.content.email}</span>
                            </div>
                          )}
                        </>
                      )}
                      {(selectedType?.id === 'document' || selectedType?.id === 'media') && (
                        <div className="flex flex-col">
                          <span className="text-[0.65vw] text-slate-400 font-semibold uppercase mb-[0.1vw]">Uploaded File</span>
                          <span className="text-[0.85vw] text-slate-800 font-medium">
                            {formData.content?.fileName || (formData.content?.url ? 'File ready' : 'No file uploaded yet')}
                          </span>
                          {formData.content?.fileSize && (
                            <span className="text-[0.7vw] text-slate-400 mt-[0.1vw]">
                              {(formData.content.fileSize / 1024 / 1024).toFixed(2)} MB · {formData.content.mimeType}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Style Summary */}
                  <div className="bg-white border border-slate-200 rounded-[0.75vw] p-[1.25vw]">
                    <p className="text-[0.65vw] font-bold text-slate-400 uppercase tracking-wider mb-[0.75vw]">Style</p>
                    <div className="flex items-center gap-[1vw]">
                      <div className="flex items-center gap-[0.4vw]">
                        <div className="w-[1.2vw] h-[1.2vw] rounded border border-slate-200" style={{ backgroundColor: formData.customization.foregroundColor }} />
                        <span className="text-[0.75vw] text-slate-600 font-mono uppercase">{formData.customization.foregroundColor}</span>
                      </div>
                      <div className="flex items-center gap-[0.4vw]">
                        <div className="w-[1.2vw] h-[1.2vw] rounded border border-slate-200" style={{ backgroundColor: formData.customization.backgroundColor }} />
                        <span className="text-[0.75vw] text-slate-600 font-mono uppercase">{formData.customization.backgroundColor}</span>
                      </div>
                      <span className="text-[0.75vw] text-slate-500 capitalize">{formData.customization.dotStyle} dots</span>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="px-[1.25vw] py-[0.5vw] border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`
                flex items-center gap-[0.5vw] px-[1.25vw] py-[0.7vw] rounded-[0.5vw]
                text-[0.9vw] font-bold transition-all
                ${currentStep === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200'
                }
              `}
            >
              <FiArrowLeft className="text-[1.1vw]" />
              Go Back
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-[0.75vw] px-[2vw] py-[0.75vw]
                  text-white rounded-[0.5vw] text-[0.95vw] font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-[1px] active:translate-y-[0px]"
                style={{ backgroundColor: '#2563eb' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Continue to {steps[currentStep].title}
                <FiArrowRight className="text-[1.1vw]" />
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit, onValidationError)}
                disabled={isSubmitting}
                className="flex items-center gap-[0.75vw] px-[2.5vw] py-[0.75vw]
                  text-white rounded-[0.5vw] text-[0.95vw] font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2563eb' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-[1.25vw] h-[1.25vw] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {/* <FiCheck className="text-[1.1vw]" /> */}
                    Finalize & Create QR
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="col-span-5 bg-white rounded-[0.75vw] shadow-sm p-[1.5vw] flex flex-col overflow-y-auto custom-scrollbar">
          <h3 className="text-[1vw] font-semibold text-slate-800 mb-[1vw]">
            {currentStep === 1 ? 'Live Preview' : 'QR Preview'}
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <QRPreview 
                customization={formData.customization} 
                content={formData.content} 
                type={formData.type} 
                isDynamic={formData.isDynamic}
                disabled={currentStep === 1}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default QRCreator;