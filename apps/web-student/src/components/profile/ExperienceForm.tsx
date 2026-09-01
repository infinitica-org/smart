import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExperienceSchema, type Experience } from '@/lib/schemas/profile.schema';

interface ExperienceFormProps {
  initialData?: Experience;
  onSubmit: (data: Experience) => void;
  onCancel: () => void;
}

export function ExperienceForm({ initialData, onSubmit, onCancel }: ExperienceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof ExperienceSchema>>({
    resolver: zodResolver(ExperienceSchema) as any,
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      role: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      tags: [],
      description: '',
      documents: [],
    },
  });

  const onSubmitHandler = (data: z.infer<typeof ExperienceSchema>) => {
    const rawTags = (document.getElementById('tags-input') as HTMLInputElement)?.value || '';
    const newTags = rawTags
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    // If it's an edit, we might want to preserve existing tags if input is empty, but for now just overwrite
    onSubmit({ ...data, tags: newTags.length > 0 ? newTags : data.tags || [] } as Experience);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler as any)} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Job Title / Role <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('role')}
            placeholder="e.g. AI Engineering Intern"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.role && <span className="text-red-400 text-xs">{errors.role.message}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Company Name <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('company')}
            placeholder="e.g. Generative AI Consortium"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.company && <span className="text-red-400 text-xs">{errors.company.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Start Date <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('startDate')}
            placeholder="e.g. Nov 2024"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.startDate && (
            <span className="text-red-400 text-xs">{errors.startDate.message}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">End Date</label>
          <input
            {...register('endDate')}
            placeholder="e.g. Apr 2025"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Location <span className="text-[#00fad0]">*</span>
          </label>
          <input
            {...register('location')}
            placeholder="e.g. Remote"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.location && (
            <span className="text-red-400 text-xs">{errors.location.message}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Description <span className="text-[#00fad0]">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="What did you do during this experience? What were your key achievements?"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all resize-none"
        />
        {errors.description && (
          <span className="text-red-400 text-xs">{errors.description.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Tags (comma separated)</label>
        <input
          id="tags-input"
          defaultValue={initialData?.tags?.join(', ') || ''}
          placeholder="e.g. Internship, Full Stack, Research"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        <p className="text-xs text-gray-500">Just type tags separated by commas</p>
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
          Save Experience
        </button>
      </div>
    </form>
  );
}
