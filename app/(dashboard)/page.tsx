'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Table, Tag, Modal, Form, Select, Input, Radio, DatePicker } from 'antd';
import { PlusOutlined, VideoCameraOutlined, UserOutlined } from '@ant-design/icons';
import { useStore, Session } from '@/store/useStore';
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
      filters: subordinates.map(s => ({ text: s.name, value: s.id })),
      onFilter: (value: any, record: Session) => record.subordinateId === value, // eslint-disable-line @typescript-eslint/no-explicit-any
      render: (id: string) => subordinates.find((s) => s.id === id)?.name || 'Unknown',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: Session, b: Session) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      filters: [
        { text: 'Web', value: 'web' },
        { text: 'Face-to-Face', value: 'face-to-face' },
      ],
      onFilter: (value: any, record: Session) => record.mode === value, // eslint-disable-line @typescript-eslint/no-explicit-any
      render: (mode: string) => (
        mode === 'web' ? <Tag icon={<VideoCameraOutlined />} color="blue">Web</Tag> : <Tag icon={<UserOutlined />} color="green">Face-to-Face</Tag>
      ),
    },
    {
      title: 'Theme',
      dataIndex: 'theme',
      key: 'theme',
      sorter: (a: Session, b: Session) => a.theme.localeCompare(b.theme),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search theme"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Button
            type="primary"
            onClick={() => confirm()}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
        </div>
      ),
      onFilter: (value: any, record: Session) => record.theme.toLowerCase().includes(value.toLowerCase()), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a: Session, b: Session) => a.status.localeCompare(b.status),
      filters: [
        { text: 'Scheduled', value: 'scheduled' },
        { text: 'Live', value: 'live' },
        { text: 'Completed', value: 'completed' },
      ],
      onFilter: (value: any, record: Session) => record.status === value, // eslint-disable-line @typescript-eslint/no-explicit-any
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
        <Table 
          dataSource={sessions} 
          columns={columns} 
          rowKey="id" 
          pagination={{ pageSize: 5 }}
          onRow={(record) => ({
            onClick: () => router.push(`/session/${record.id}/summary`),
            onKeyDown: (e) => e.key === 'Enter' && router.push(`/session/${record.id}/summary`),
            role: 'button',
            tabIndex: 0,
            'aria-label': `View details for session with theme: ${record.theme}`,
            style: { cursor: 'pointer' }
          })}
          rowClassName={() => 'session-table-row'}
        />
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
