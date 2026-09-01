import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SkillSchema, type Skill } from '@/lib/schemas/profile.schema';

interface SkillsFormProps {
  initialData?: Skill;
  type: 'technical' | 'language';
  onSubmit: (data: Skill) => void;
  onCancel: () => void;
}

export function SkillsForm({ initialData, type, onSubmit, onCancel }: SkillsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Skill>({
    resolver: zodResolver(SkillSchema),
    defaultValues: initialData || {
      id: crypto.randomUUID(),
      language: '',
      proficiency: 'Beginner',
      verified: false,
      type: type,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          {type === 'technical' ? 'Skill Name' : 'Language'}{' '}
          <span className="text-[#00fad0]">*</span>
        </label>
        <input
          {...register('language')}
          placeholder={
            type === 'technical' ? 'e.g. React.js, Python, AWS' : 'e.g. English, Spanish'
          }
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00fad0]/50 transition-all"
        />
        {errors.language && <span className="text-red-400 text-xs">{errors.language.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">
          Proficiency <span className="text-[#00fad0]">*</span>
        </label>
        <select
          {...register('proficiency')}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00fad0]/50 transition-all"
        >
          {type === 'technical' ? (
            <>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </>
          ) : (
            <>
              <option value="Basic">Basic</option>
              <option value="Beginner">Beginner</option>
              <option value="Conversational">Conversational</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Fluent">Fluent</option>
              <option value="Native">Native</option>
              <option value="Native or Bilingual">Native or Bilingual</option>
            </>
          )}
        </select>
        {errors.proficiency && (
          <span className="text-red-400 text-xs">{errors.proficiency.message}</span>
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
          Save {type === 'technical' ? 'Skill' : 'Language'}
        </button>
      </div>
    </form>
  );
}
