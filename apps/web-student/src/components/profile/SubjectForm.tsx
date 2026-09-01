import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Subject } from '@/lib/schemas/profile.schema';
import * as z from 'zod';

// We just need a simple schema for SubjectForm since it's just a name
const SubjectFormSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Subject name is required'),
});

interface SubjectFormProps {
  initialData?: Subject;
  onSubmit: (data: Subject) => void;
  onCancel: () => void;
}

export function SubjectForm({ initialData, onSubmit, onCancel }: SubjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Subject>({
    resolver: zodResolver(SubjectFormSchema),
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      name: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Subject Name <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="e.g. Data Structures and Algorithms"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.name && <span className="text-red-400 text-xs">{errors.name.message}</span>}
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
          Save Subject
        </button>
      </div>
    </form>
  );
}
