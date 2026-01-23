'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Table, Tag, Modal, Form, Select, Input, Radio, DatePicker } from 'antd';
import { PlusOutlined, VideoCameraOutlined, UserOutlined } from '@ant-design/icons';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function Dashboard() {
  const router = useRouter();
  const { subordinates, sessions, addSession, fetchSubordinates, fetchSessions } = useStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSubordinates();
    fetchSessions();
  }, [fetchSubordinates, fetchSessions]);

  const handleStart = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      const startDate = values.sessionDateTime.toDate();
      
      const sessionId = await addSession({
        subordinateId: values.subordinateId,
        date: startDate.toISOString(),
        mode: values.mode,
        theme: values.theme,
      });
      
      if (sessionId) {
        setIsModalVisible(false);
        router.push(`/session/${sessionId}`);
      }
    });
  };

  const columns = [
    {
      title: 'Subordinate',
      dataIndex: 'subordinateId',
      key: 'subordinateId',
      render: (id: string) => subordinates.find((s) => s.id === id)?.name || 'Unknown',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => (
        mode === 'web' ? <Tag icon={<VideoCameraOutlined />} color="blue">Web</Tag> : <Tag icon={<UserOutlined />} color="green">Face-to-Face</Tag>
      ),
    },
    {
      title: 'Theme',
      dataIndex: 'theme',
      key: 'theme',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'default' : 'processing'}>{status.toUpperCase()}</Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleStart}>
          Start 1on1
        </Button>
      </div>

      <Card title="Recent Sessions" styles={{ body: { padding: 0 } }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} />
      </Card>

      <Modal
        title="Start New 1on1 Session"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Start Session"
      >
         <Form form={form} layout="vertical" initialValues={{ mode: 'web', sessionDateTime: dayjs().add(1, 'hour'), duration: 1 }}>
          <Form.Item
            name="subordinateId"
            label="Subordinate"
            rules={[{ required: true, message: 'Please select a subordinate' }]}
          >
            <Select placeholder="Select a subordinate">
              {subordinates.map((sub) => (
                <Option key={sub.id} value={sub.id}>{sub.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mode"
            label="Mode"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="web"><VideoCameraOutlined /> Web Conference</Radio.Button>
              <Radio.Button value="face-to-face"><UserOutlined /> Face-to-Face</Radio.Button>
            </Radio.Group>
          </Form.Item>

           <Form.Item
            name="theme"
            label="Theme / Topic"
            rules={[{ required: true, message: 'Please enter a theme' }]}
          >
            <Input placeholder="e.g., Career Growth, Project A, Feedback" />
          </Form.Item>

          <Form.Item
            name="sessionDateTime"
            label="Session Date & Time"
            rules={[{ required: true, message: 'Please select date and time' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="Select date and time"
            />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Duration (hours)"
            initialValue={1}
          >
            <Input type="number" min={0.5} max={8} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
