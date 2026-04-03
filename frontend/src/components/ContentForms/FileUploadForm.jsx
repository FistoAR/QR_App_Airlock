import React, { useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { toast } from '../../components/UI/Toast';

import { FiUpload, FiFile, FiImage, FiVideo, FiMusic, FiX, FiCheckCircle } from 'react-icons/fi';
import { contentAPI } from '../../services/api';

const fileTypeIcons = {
  image: FiImage,
  video: FiVideo,
  audio: FiMusic,
  document: FiFile,
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileUploadForm = ({ type }) => {
  const { setValue, watch } = useFormContext();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileData = watch('content');

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await contentAPI.upload(formData);
      const data = response.data.data;

      setValue('content', {
        url: data.url,
        path: data.path, // Added path for backend deletion tracking
        publicId: data.publicId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        fileType: data.fileType,
      });

      toast.success('File uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
  });

  const removeFile = () => {
    setValue('content', {});
  };

  const FileIcon = fileTypeIcons[fileData?.fileType] || FiFile;

  return (
    <div className="space-y-[1vw]">
      {!fileData?.url ? (
        <>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-[0.5vw] p-[2vw] text-center cursor-pointer
              transition-all duration-200
              ${uploading ? 'pointer-events-none opacity-60' : ''}
            `}
            style={{
              borderColor: isDragActive ? '#3b82f6' : '#cbd5e1',
              backgroundColor: isDragActive ? '#eff6ff' : undefined,
            }}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-[0.75vw]">
                <div className="w-[3vw] h-[3vw] mx-auto rounded-full border-4 animate-spin" style={{ borderColor: '#dbeafe', borderTopColor: '#2563eb' }} />
                <p className="text-[0.9vw] text-slate-600">Uploading... {uploadProgress}%</p>
                <div className="w-full h-[0.4vw] bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ backgroundColor: '#2563eb', width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <FiUpload className="mx-auto text-[2.5vw] text-slate-400 mb-[0.75vw]" />
                <p className="text-[0.95vw] font-medium text-slate-700 mb-[0.25vw]">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-[0.8vw] text-slate-500 mb-[0.5vw]">
                  or click to browse
                </p>
                <p className="text-[0.7vw] text-slate-400">
                  Images, Videos, Documents up to 50MB
                </p>
              </>
            )}
          </div>

          {/* Supported Formats */}
          <div className={`grid ${type === 'media' ? 'grid-cols-2' : 'grid-cols-1'} gap-[0.5vw]`}>
            {[
              { type: 'Images', formats: 'PNG, JPG, GIF, WebP, SVG', icon: FiImage, category: 'media' },
              { type: 'Videos', formats: 'MP4, WebM, MOV', icon: FiVideo, category: 'media' },
              { type: 'Documents', formats: 'PDF, DOC, PPT, Word', icon: FiFile, category: 'document' },
            ]
            .filter(item => !type || item.category === type)
            .map((item) => (
              <div key={item.type} className="p-[0.5vw] bg-slate-50 rounded-[0.4vw] text-center">
                <item.icon className="mx-auto text-[1.25vw] text-slate-400 mb-[0.25vw]" />
                <p className="text-[0.7vw] font-medium text-slate-700">{item.type}</p>
                <p className="text-[0.6vw] text-slate-400">{item.formats}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Uploaded File Preview */
        <div className="border border-slate-200 rounded-[0.5vw] overflow-hidden">
          {/* File Preview */}
          {fileData.fileType === 'image' && fileData.mimeType !== 'image/gif' && (
            <div className="bg-slate-100 p-[1vw] flex justify-center">
              <img
                src={fileData.url?.startsWith('http') || fileData.url?.startsWith('data:') ? fileData.url : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001'}${fileData.url}`}
                alt={fileData.fileName}
                className="max-h-[15vw] rounded-[0.3vw] object-contain"
              />
            </div>
          )}

          {fileData.fileType === 'video' && (
            <div className="bg-slate-900 p-[0.5vw]">
              <video
                src={fileData.url?.startsWith('http') ? fileData.url : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001'}${fileData.url}`}
                controls
                className="w-full max-h-[15vw] rounded-[0.3vw]"
              />
            </div>
          )}

          {/* File Info */}
          <div className="p-[1vw] flex items-center justify-between">
            <div className="flex items-center gap-[0.75vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                <FileIcon className="text-[1.25vw]" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="text-[0.85vw] font-medium text-slate-800 truncate max-w-[15vw]">
                  {fileData.fileName}
                </p>
                <p className="text-[0.7vw] text-slate-500">
                  {formatFileSize(fileData.fileSize)} • {fileData.mimeType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-[0.5vw]">
              <span className="flex items-center gap-[0.25vw] text-green-600 text-[0.75vw]">
                <FiCheckCircle />
                Uploaded
              </span>
              <button
                type="button"
                onClick={removeFile}
                className="p-[0.4vw] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[0.3vw] transition-colors"
              >
                <FiX className="text-[1vw]" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Info */}
      <div className="p-[0.75vw] bg-blue-50 rounded-[0.4vw] border border-blue-200">
        <p className="text-[0.75vw] text-blue-700">
          <strong>Note:</strong> File QR codes are always dynamic. When scanned, users will be directed to a viewer page where they can view or download the file.
        </p>
      </div>
    </div>
  );
};

export default FileUploadForm;