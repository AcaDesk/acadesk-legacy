'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSessionSchema, type CreateSessionInput } from '@/core/types/attendance';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import { TimeRangePicker } from '@ui/time-range-picker';
import { DatePicker } from '@ui/date-picker';
import { ClassSelector } from '@/components/features/common/class-selector';

interface AttendanceSessionFormProps {
  classes: Array<{ id: string; name: string; subject?: string | null; active?: boolean }>;
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
    watch,
    setValue,
  } = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      session_date: new Date().toISOString().split('T')[0],
      scheduled_start_at: '',
      scheduled_end_at: '',
    },
  });

  // Convert string date to Date object for DatePicker
  const sessionDateValue = watch('session_date')
    ? new Date(watch('session_date'))
    : undefined;

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
        <ClassSelector
          value={watch('class_id') || ''}
          onChange={(value) => setValue('class_id', value, { shouldValidate: true })}
          placeholder="클래스를 선택하세요"
          classes={classes.map(cls => ({
            id: cls.id,
            name: cls.name,
            subject: cls.subject || null,
            active: cls.active ?? true
          }))}
        />
        {errors.class_id && (
          <p className="text-red-500 text-sm mt-1">{errors.class_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          수업 날짜 <span className="text-red-500">*</span>
        </label>
        <DatePicker
          value={sessionDateValue}
          onChange={(date) => {
            if (date) {
              setValue('session_date', date.toISOString().split('T')[0], {
                shouldValidate: true,
              });
            }
          }}
          placeholder="날짜 선택"
          isDisabled={isSubmitting}
          className={errors.session_date ? 'border-red-500' : ''}
        />
        {errors.session_date && (
          <p className="text-red-500 text-sm mt-1">{errors.session_date.message}</p>
        )}
      </div>

      <TimeRangePicker
        startTime={watch('scheduled_start_at') || ''}
        endTime={watch('scheduled_end_at') || ''}
        onStartTimeChange={(value) => setValue('scheduled_start_at', value)}
        onEndTimeChange={(value) => setValue('scheduled_end_at', value)}
        startLabel="시작 시간"
        endLabel="종료 시간"
        startError={errors.scheduled_start_at?.message}
        endError={errors.scheduled_end_at?.message}
        required
        disabled={isSubmitting}
      />

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
