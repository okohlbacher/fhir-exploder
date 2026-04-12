import { toPng } from 'html-to-image';
import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ActionIcon,
  Button,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import {
  IconCheck,
  IconMessagePlus,
  IconSend,
} from '@tabler/icons-react';

import { useSettings } from '../../hooks/useSettings';

/**
 * Dev-mode floating feedback button.
 *
 * Captures a screenshot of the current page, lets the user describe an issue,
 * and POSTs the feedback (including screenshot + current settings) to
 * /api/feedback where the Vite feedbackPlugin writes it as a JSON file in
 * `feedback/`. Claude can then read these files to inform UI improvements.
 */
export function FeedbackButton() {
  const [opened, setOpened] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const location = useLocation();
  const { settings } = useSettings();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpen = useCallback(async () => {
    // Capture screenshot BEFORE showing the modal overlay.
    // Wait a tick so async-loaded content (resource detail, search results)
    // has time to render into the DOM before we screenshot.
    setCapturing(true);
    await new Promise((r) => setTimeout(r, 300));
    let captured: string | null = null;
    try {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        captured = await toPng(mainEl as HTMLElement, {
          quality: 0.8,
          pixelRatio: 1,
        });
      }
    } catch (err) {
      console.error('[FeedbackButton] Screenshot capture failed:', err);
    }
    setScreenshot(captured);
    setCapturing(false);
    setDescription('');
    setSubmitted(false);
    setOpened(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpened(false);
    setSubmitted(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;
    try {
      const body = {
        page: location.pathname,
        url: window.location.href,
        description: description.trim(),
        screenshot: screenshot ?? undefined,
        settings: settings ?? undefined,
      };
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setSubmitted(true);
      setTimeout(() => {
        setOpened(false);
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error('[FeedbackButton] Failed to save feedback:', err);
    }
  }, [description, screenshot, settings, location.pathname]);

  return (
    <>
      {/* Floating button on the right edge */}
      <Tooltip label="Send Feedback" position="left">
        <ActionIcon
          onClick={handleOpen}
          loading={capturing}
          color="yellow"
          variant="filled"
          size="xl"
          radius="md"
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 400,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <IconMessagePlus size={22} />
        </ActionIcon>
      </Tooltip>

      {/* Feedback modal */}
      <Modal
        opened={opened}
        onClose={handleClose}
        title={
          <Group gap="xs">
            <IconMessagePlus size={20} color="var(--mantine-color-yellow-6)" />
            <Text fw={600}>Feedback</Text>
          </Group>
        }
        size="lg"
        centered
      >
        {submitted ? (
          <Stack align="center" py="xl">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="green" fw={500}>
              Feedback saved! Thank you.
            </Text>
          </Stack>
        ) : (
          <Stack gap="md">
            {/* Page info */}
            <Text size="sm" c="dimmed">
              <Text span fw={500}>Page:</Text>{' '}
              <Text span ff="monospace">{location.pathname}</Text>
            </Text>

            {/* Screenshot preview */}
            {screenshot && (
              <Image
                src={screenshot}
                alt="Screenshot"
                h={140}
                fit="cover"
                radius="sm"
                style={{ border: '1px solid var(--mantine-color-gray-3)' }}
              />
            )}

            {/* Description */}
            <Textarea
              ref={textareaRef}
              label="What's the issue or suggestion?"
              placeholder="Describe what you see, what's wrong, or what could be improved..."
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              rows={4}
              autoFocus
            />

            {/* Submit */}
            <Group justify="flex-end">
              <Button
                onClick={handleSubmit}
                disabled={!description.trim()}
                color="yellow"
                leftSection={<IconSend size={16} />}
              >
                Submit
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
