'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Table,
  Modal,
  TextInput,
  Select,
  Title,
  Group,
  ActionIcon,
  Container,
  Paper,
  ScrollArea,
  Stack,
  Box,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

type Option = {
  id?: number;
  label: string;
  next_question_id: number | null;
  price_modifier: number | null;
};

type Question = {
  id?: number;                     // undefined => new
  field: string;
  text: string;
  subtext: string;
  type: string;
  hint: string;
  validationKey: string | null;
  input: Record<string, string> | null;
  next_question_id: number | null; // for non-option questions
  options: Option[];
};

const blankQuestion = (): Question => ({
  field: '',
  text: '',
  subtext: '',
  type: 'text',
  hint: '',
  validationKey: null,
  input: null,
  next_question_id: null,
  options: [],
});

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const darkInputStyle =
    colorScheme === 'dark'
      ? {
          input: {
            backgroundColor: theme.colors.dark[6],
            color: theme.white,
            borderColor: theme.colors.dark[4],
          },
          dropdown: {
            backgroundColor: theme.colors.dark[6],
          },
          option: {
            color: theme.white,
            '&[data-selected]': {
              backgroundColor: theme.colors.dark[5],
              color: theme.white,
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.dark[4],
              color: theme.white,
            },
          },
        }
      : undefined;

  /* -------------------------------------------------------------- */
  /* Fetch list once, then after each save                           */
  /* -------------------------------------------------------------- */
  const fetchQuestions = async () => {
    const res = await fetch('/api/questions');
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  /* -------------------------------------------------------------- */
  /* Handlers                                                        */
  /* -------------------------------------------------------------- */
  const openEditModal = (question: Question) => {
    setSelectedQuestion(question);
    setEditModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedQuestion(blankQuestion());
    setEditModalOpen(true);
  };

  const handleInputChange = (field: keyof Question, value: string | number | null) => {
    if (!selectedQuestion) return;
    setSelectedQuestion({ ...selectedQuestion, [field]: value });
  };

  const handleOptionChange = (
    idx: number,
    field: keyof Option,
    value: string | number | null,
  ) => {
    if (!selectedQuestion) return;
    const opts = [...selectedQuestion.options];
    opts[idx] = { ...opts[idx], [field]: value };
    setSelectedQuestion({ ...selectedQuestion, options: opts });
  };

  const addOption = () => {
    if (!selectedQuestion) return;
    setSelectedQuestion({
      ...selectedQuestion,
      options: [
        ...selectedQuestion.options,
        { label: 'New Option', next_question_id: null, price_modifier: 0 },
      ],
    });
  };

  const removeOption = (idx: number) => {
    if (!selectedQuestion) return;
    const opts = selectedQuestion.options.filter((_, i) => i !== idx);
    setSelectedQuestion({ ...selectedQuestion, options: opts });
  };

  const saveQuestion = async () => {
    if (!selectedQuestion) return;

    // Validate that no options have empty labels
    const hasEmptyLabels = selectedQuestion.options.some(opt => !opt.label.trim());
    if (hasEmptyLabels) {
      alert('Please fill in all option labels before saving');
      return;
    }

    const method = selectedQuestion.id ? 'PUT' : 'POST';
    const res = await fetch('/api/questions' + (method === 'POST' ? '' : ''), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedQuestion),
    });

    if (res.ok) {
      setEditModalOpen(false);
      await fetchQuestions();
    } else {
      console.error('Save failed', await res.text());
    }
  };

  /* -------------------------------------------------------------- */
  /* Render                                                          */
  /* -------------------------------------------------------------- */
  const rows = questions.map((q) => (
    <Table.Tr key={q.id}>
      <Table.Td>{q.id}</Table.Td>
      <Table.Td>{q.field}</Table.Td>
      <Table.Td>{q.text}</Table.Td>
      <Table.Td>{q.type}</Table.Td>
      <Table.Td>
        {q.type === 'text' || q.type === 'number'
          ? q.next_question_id ?? '-'
          : '-'}
      </Table.Td>
      <Table.Td>
        <Button size="xs" onClick={() => openEditModal(q)}>
          Edit
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="lg" px="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" mb="md">
          <Title order={1} fw={700} c="blue.6">
            Questions
          </Title>
          <Button onClick={openAddModal}>Add Question</Button>
        </Group>

        <Paper radius="md" shadow="sm" withBorder p="md" bg="transparent">
          <ScrollArea>
          <Table highlightOnHover horizontalSpacing="xl" verticalSpacing="xl" withColumnBorders>
          <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Field</Table.Th>
                  <Table.Th>Text</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Next</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
              <Table.Caption>This table is a list of questions - you can edit them and set properties like next question, price modifier, etc.</Table.Caption>
            </Table>
          </ScrollArea>
        </Paper>

        {/* ---------- EDIT / ADD MODAL ---------- */}
        <Modal
          opened={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={
            selectedQuestion?.id
              ? `Edit Question ${selectedQuestion.id}`
              : 'Add New Question'
          }
          size="lg"
          overlayProps={{ color: '#000', opacity: 0.75, blur: 2 }}
          styles={{
            content: { backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white },
            header: { backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white },
            title: { color: colorScheme === 'dark' ? theme.white : theme.black },
            body: { color: colorScheme === 'dark' ? theme.white : theme.black },
          }}
        >
          {selectedQuestion && (
            <ScrollArea h={600} pr="md">
              <Box>
                <TextInput
                  label="Field (unique key)"
                  value={selectedQuestion.field}
                  onChange={(e) => handleInputChange('field', e.target.value)}
                  mb="sm"
                  styles={darkInputStyle}
                />

                <Select
                  label="Type"
                  data={['text', 'number', 'radio', 'dropdown']}
                  value={selectedQuestion.type}
                  onChange={(value) => handleInputChange('type', value)}
                  mb="sm"
                  className={colorScheme === 'dark' ? 'dark-select' : undefined}
                />

                <TextInput
                  label="Text"
                  value={selectedQuestion.text}
                  onChange={(e) => handleInputChange('text', e.target.value)}
                  mb="sm"
                  styles={darkInputStyle}
                />

                <TextInput
                  label="Subtext"
                  value={selectedQuestion.subtext}
                  onChange={(e) => handleInputChange('subtext', e.target.value)}
                  mb="sm"
                  styles={darkInputStyle}
                />

                <TextInput
                  label="Hint"
                  value={selectedQuestion.hint}
                  onChange={(e) => handleInputChange('hint', e.target.value)}
                  mb="sm"
                  styles={darkInputStyle}
                />

                {(selectedQuestion.type === 'text' ||
                  selectedQuestion.type === 'number') && (
                  <Select
                    label="Next Question"
                    data={[
                      { value: '', label: 'Not Set' },
                      { value: 'complete', label: 'Complete' },
                      ...questions.map((qq) => ({
                        value: String(qq.id),
                        label: `${qq.id} – ${qq.text.slice(0, 60)}`,
                      })),
                    ]}
                    value={
                      selectedQuestion.next_question_id === null
                        ? ''
                        : selectedQuestion.next_question_id === -1
                        ? 'complete'
                        : String(selectedQuestion.next_question_id)
                    }
                    placeholder="Not Set"
                    clearable
                    searchable
                    onChange={(val) =>
                      handleInputChange(
                        'next_question_id',
                        val === 'complete' ? -1 : val ? parseInt(val, 10) : null,
                      )
                    }
                    mb="sm"
                    className={colorScheme === 'dark' ? 'dark-select' : undefined}
                  />
                )}

                {(selectedQuestion.type === 'radio' ||
                  selectedQuestion.type === 'dropdown') && (
                  <>
                    <Title order={4} mt="md" mb="xs">
                      Options
                    </Title>
                    <Table withColumnBorders striped verticalSpacing="md" horizontalSpacing="lg" c={colorScheme === 'dark' ? 'gray.0' : undefined}>
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th>Next&nbsp;ID</th>
                          <th>Price £</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuestion.options.map((opt, i) => (
                          <tr key={i}>
                            <td>
                              <TextInput
                                value={opt.label}
                                onChange={(e) =>
                                  handleOptionChange(i, 'label', e.target.value)
                                }
                                styles={darkInputStyle}
                              />
                            </td>
                            <td>
                              <Select
                                data={[
                                  { value: '', label: 'Not Set' },
                                  { value: 'complete', label: 'Complete' },
                                  ...questions.map((qq) => ({
                                    value: String(qq.id),
                                    label: `${qq.id} – ${qq.text.slice(0, 60)}`,
                                  })),
                                ]}
                                value={
                                  opt.next_question_id === null
                                    ? ''
                                    : opt.next_question_id === -1
                                    ? 'complete'
                                    : String(opt.next_question_id)
                                }
                                placeholder="Not Set"
                                clearable
                                searchable
                                onChange={(val) =>
                                  handleOptionChange(
                                    i,
                                    'next_question_id',
                                    val === 'complete' ? -1 : val ? parseInt(val, 10) : null,
                                  )
                                }
                                className={colorScheme === 'dark' ? 'dark-select' : undefined}
                              />
                            </td>
                            <td>
                              <TextInput
                                value={opt.price_modifier ?? ''}
                                onChange={(e) =>
                                  handleOptionChange(
                                    i,
                                    'price_modifier',
                                    e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : 0,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <ActionIcon
                                color="red"
                                onClick={() => removeOption(i)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <Button variant="light" mt="sm" onClick={addOption}>
                      Add Option
                    </Button>
                  </>
                )}

                <Button fullWidth mt="lg" onClick={saveQuestion}>
                  Save
                </Button>
              </Box>
            </ScrollArea>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}