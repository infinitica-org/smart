import { SKILL_DEFINITIONS } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillReq } from '../lib/skill-catalog';
import { SkillsEditor } from './ui';

const [first, second] = SKILL_DEFINITIONS;

function open(props: { skills?: SkillReq[]; onChange?: (next: SkillReq[]) => void } = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(<SkillsEditor skills={props.skills ?? []} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: /Add skill/i }));
  return onChange;
}

function need<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value');
  return value;
}

describe('SkillsEditor (catalog picker)', () => {
  afterEach(cleanup);

  it('has no free-text skill input, only a list of catalog skills', () => {
    open();

    expect(screen.queryByRole('textbox')).toBeNull();
    const picker = screen.getByRole('combobox', { name: 'Skill' });
    expect(within(picker).getAllByRole('option')).toHaveLength(SKILL_DEFINITIONS.length + 1);
    expect(within(picker).getByRole('option', { name: need(first).name })).toBeTruthy();
  });

  it('cannot add until a skill is chosen', () => {
    const onChange = open();

    const add = screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.click(add);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds the chosen skill with its real catalog code and the chosen minimum level', () => {
    const onChange = open();

    fireEvent.change(screen.getByRole('combobox', { name: 'Skill' }), {
      target: { value: need(first).code },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Minimum level' }), {
      target: { value: 'Advanced' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([
      { code: need(first).code, name: need(first).name, level: 'Advanced' },
    ]);
  });

  it('no longer offers a skill that is already added', () => {
    open({ skills: [{ code: need(first).code, name: need(first).name, level: 'Beginner' }] });

    const picker = screen.getByRole('combobox', { name: 'Skill' });
    expect(within(picker).queryByRole('option', { name: need(first).name })).toBeNull();
    expect(within(picker).getByRole('option', { name: need(second).name })).toBeTruthy();
  });

  it('removes a skill by its code', () => {
    const onChange = vi.fn();
    render(
      <SkillsEditor
        skills={[
          { code: need(first).code, name: need(first).name, level: 'Beginner' },
          { code: need(second).code, name: need(second).name, level: 'Advanced' },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: `Remove ${need(first).name}` }));

    expect(onChange).toHaveBeenCalledWith([
      { code: need(second).code, name: need(second).name, level: 'Advanced' },
    ]);
  });

  it('closes the picker on cancel without adding anything', () => {
    const onChange = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('combobox', { name: 'Skill' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
