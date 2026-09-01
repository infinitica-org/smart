import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EducationSchema, type Education } from '@/lib/schemas/profile.schema';

interface EducationFormProps {
  initialData?: Education;
  onSubmit: (data: Education) => void;
  onCancel: () => void;
}

export function EducationForm({ initialData, onSubmit, onCancel }: EducationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Education>({
    resolver: zodResolver(EducationSchema),
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      institutionName: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      current: false,
      grade: '',
      description: '',
    },
  });

  const isCurrent = watch('current');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Institution Name <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('institutionName')}
          placeholder="e.g. Stanford University"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.institutionName && (
          <span className="text-red-400 text-xs">{errors.institutionName.message}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Degree <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('degree')}
            placeholder="e.g. Bachelor of Science"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.degree && <span className="text-red-400 text-xs">{errors.degree.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Field of Study <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('fieldOfStudy')}
            placeholder="e.g. Computer Science"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.fieldOfStudy && (
            <span className="text-red-400 text-xs">{errors.fieldOfStudy.message}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Start Date <span className="text-[#00fad0]">*</span>
          </label>
          <input
            type="month"
            {...register('startDate')}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.startDate && (
            <span className="text-red-400 text-xs">{errors.startDate.message}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">End Date</label>
          <input
            type="month"
            {...register('endDate')}
            disabled={isCurrent}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="current"
          {...register('current')}
          className="w-4 h-4 rounded border-gray-600 text-[#00fad0] focus:ring-[#00fad0] focus:ring-offset-gray-900 bg-black/40"
        />
        <label htmlFor="current" className="text-sm text-gray-300">
          I currently study here
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Grade / CGPA</label>
        <input
          {...register('grade')}
          placeholder="e.g. 3.8/4.0"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Activities, societies, specific achievements..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all resize-none"
        />
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
          Save Education
        </button>
      </div>
    </form>
  );
}
