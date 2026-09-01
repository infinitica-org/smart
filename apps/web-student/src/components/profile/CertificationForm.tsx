import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CertificationSchema, type Certification } from '@/lib/schemas/profile.schema';

interface CertificationFormProps {
  initialData?: Certification;
  onSubmit: (data: Certification) => void;
  onCancel: () => void;
}

export function CertificationForm({ initialData, onSubmit, onCancel }: CertificationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Certification>({
    resolver: zodResolver(CertificationSchema),
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      name: '',
      issuer: '',
      issueDate: '',
      credentialId: '',
      credentialUrl: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Certification Name <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="e.g. AWS Certified Solutions Architect"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.name && <span className="text-red-400 text-xs">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Issuing Organization <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('issuer')}
          placeholder="e.g. Amazon Web Services (AWS)"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.issuer && <span className="text-red-400 text-xs">{errors.issuer.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Issue Date <span className="text-[#00fad0]">*</span>
        </label>
        <input
          type="month"
          {...register('issueDate')}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.issueDate && (
          <span className="text-red-400 text-xs">{errors.issueDate.message}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Credential ID</label>
          <input
            {...register('credentialId')}
            placeholder="e.g. 123456789"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Credential URL</label>
          <input
            {...register('credentialUrl')}
            placeholder="https://..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.credentialUrl && (
            <span className="text-red-400 text-xs">{errors.credentialUrl.message}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 text-sm font-semibold text-black bg-[#00fad0] hover:bg-[#00fad0]/90 rounded-xl shadow-[0_0_15px_rgba(0,250,208,0.2)] transition-all"
        >
          Save Certification
        </button>
      </div>
    </form>
  );
}
