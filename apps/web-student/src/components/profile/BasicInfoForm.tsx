import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BasicInfoSchema, type BasicInfo } from '@/lib/schemas/profile.schema';

interface BasicInfoFormProps {
  initialData?: BasicInfo;
  onSubmit: (data: BasicInfo) => void;
  onCancel: () => void;
}

export function BasicInfoForm({ initialData, onSubmit, onCancel }: BasicInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicInfo>({
    resolver: zodResolver(BasicInfoSchema),
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      dob: '',
      gender: '',
      phoneNumber: '',
      phoneCountryCode: '',
      linkedinUrl: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            First Name <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('firstName')}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.firstName && (
            <span className="text-red-400 text-xs">{errors.firstName.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Last Name <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('lastName')}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.lastName && (
            <span className="text-red-400 text-xs">{errors.lastName.message}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Date of Birth</label>
          <input
            type="date"
            {...register('dob')}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Gender</label>
          <select
            {...register('gender')}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Phone Number</label>
        <div className="flex gap-2">
          <input
            {...register('phoneCountryCode')}
            placeholder="+1"
            className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          <input
            {...register('phoneNumber')}
            placeholder="1234567890"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">LinkedIn Profile URL</label>
        <input
          {...register('linkedinUrl')}
          placeholder="https://linkedin.com/in/username"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.linkedinUrl && (
          <span className="text-red-400 text-xs">{errors.linkedinUrl.message}</span>
        )}
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
          Save Details
        </button>
      </div>
    </form>
  );
}
