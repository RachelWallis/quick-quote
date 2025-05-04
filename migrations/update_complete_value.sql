-- Update questions table
UPDATE questions SET next_question_id = 'Complete' WHERE next_question_id = -1;

-- Update question_options table
UPDATE question_options SET next_question_id = 'Complete' WHERE next_question_id = -1; 