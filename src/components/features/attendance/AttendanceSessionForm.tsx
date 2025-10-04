'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSessionSchema, type CreateSessionInput } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AttendanceSessionFormProps {
  classes: Array<{ id: string; name: string }>;
  onSubmit: (data: CreateSessionInput) => Promise<void>;
  onCancel: () => void;
}

export function AttendanceSessionForm({
  classes,
  onSubmit,
  onCancel,
}: AttendanceSessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      session_date: new Date().toISOString().split('T')[0],
    },
  });

  const onFormSubmit = async (data: CreateSessionInput) => {
    try {
      setIsSubmitting(true);

      // Combine date and time for scheduled times
      const sessionDate = data.session_date;
      const startTime = data.scheduled_start_at;
      const endTime = data.scheduled_end_at;

      const formattedData = {
        ...data,
        scheduled_start_at: `${sessionDate}T${startTime}:00`,
        scheduled_end_at: `${sessionDate}T${endTime}:00`,
      };

      await onSubmit(formattedData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          클래스 <span className="text-red-500">*</span>
        </label>
        <select
          {...register('class_id')}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">클래스를 선택하세요</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        {errors.class_id && (
          <p className="text-red-500 text-sm mt-1">{errors.class_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          수업 날짜 <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          {...register('session_date')}
          className={errors.session_date ? 'border-red-500' : ''}
        />
        {errors.session_date && (
          <p className="text-red-500 text-sm mt-1">{errors.session_date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            시작 시간 <span className="text-red-500">*</span>
          </label>
          <Input
            type="time"
            {...register('scheduled_start_at')}
            className={errors.scheduled_start_at ? 'border-red-500' : ''}
          />
          {errors.scheduled_start_at && (
            <p className="text-red-500 text-sm mt-1">
              {errors.scheduled_start_at.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            종료 시간 <span className="text-red-500">*</span>
          </label>
          <Input
            type="time"
            {...register('scheduled_end_at')}
            className={errors.scheduled_end_at ? 'border-red-500' : ''}
          />
          {errors.scheduled_end_at && (
            <p className="text-red-500 text-sm mt-1">
              {errors.scheduled_end_at.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">메모</label>
        <Textarea
          {...register('notes')}
          placeholder="수업 관련 메모를 입력하세요"
          rows={3}
        />
        {errors.notes && (
          <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '생성 중...' : '세션 생성'}
        </Button>
      </div>
    </form>
  );
}
