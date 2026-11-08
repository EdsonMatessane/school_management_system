-- O nome do curso deixa de ser único sozinho: passa a ser único por modalidade.
-- Remove a restrição antiga (unique só em name) e cria (name, modality_id).
DO $$
DECLARE
    old_constraint TEXT;
BEGIN
    FOR old_constraint IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'courses'::regclass
          AND c.contype = 'u'
          AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                WHERE attrelid = 'courses'::regclass AND attname = 'name')]
    LOOP
        EXECUTE format('ALTER TABLE courses DROP CONSTRAINT %I', old_constraint);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_courses_name_modality') THEN
        ALTER TABLE courses
            ADD CONSTRAINT uk_courses_name_modality UNIQUE (name, modality_id);
    END IF;
END $$;
