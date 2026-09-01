import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectSchema, type Project } from '@/lib/schemas/profile.schema';

interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: Project) => void;
  onCancel: () => void;
}

export function ProjectForm({ initialData, onSubmit, onCancel }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Project>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      title: '',
      problem: '',
      approach: '',
      outcome: '',
      loomUrl: '',
      githubUrl: '',
      verified: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Project Title <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('title')}
          placeholder="e.g. E-Commerce Dashboard"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.title && <span className="text-red-400 text-xs">{errors.title.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          The Problem <span className="text-[#00fad0]">*</span>
        </label>
        <textarea
          {...register('problem')}
          rows={3}
          placeholder="What problem does this project solve?"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all resize-none"
        />
        {errors.problem && <span className="text-red-400 text-xs">{errors.problem.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Your Approach & Stack <span className="text-[#00fad0]">*</span>
        </label>
        <textarea
          {...register('approach')}
          rows={3}
          placeholder="How did you solve it? What technologies did you use?"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all resize-none"
        />
        {errors.approach && <span className="text-red-400 text-xs">{errors.approach.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Outcome / Impact <span className="text-[#00fad0]">*</span>
        </label>
        <textarea
          {...register('outcome')}
          rows={2}
          placeholder="What was the result?"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all resize-none"
        />
        {errors.outcome && <span className="text-red-400 text-xs">{errors.outcome.message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Loom Video URL</label>
          <input
            {...register('loomUrl')}
            placeholder="https://loom.com/share/..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.loomUrl && <span className="text-red-400 text-xs">{errors.loomUrl.message}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">GitHub Repository</label>
          <input
            {...register('githubUrl')}
            placeholder="https://github.com/..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
          />
          {errors.githubUrl && (
            <span className="text-red-400 text-xs">{errors.githubUrl.message}</span>
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
          Save Project
        </button>
      </div>
    </form>
  );
}
