'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Table, Modal, Form, Input, Select, Upload, message, Tag, Drawer, Descriptions, Spin } from 'antd';
import { PlusOutlined, UploadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useStore, Subordinate } from '@/store/useStore';
import { createClientComponentClient } from '@/lib/supabase';

const { Title } = Typography;
const { Option } = Select;

export default function CRMPage() {
  const { subordinates, addSubordinate, fetchSubordinates, updateSubordinate, setUserId } = useStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subordinate | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const supabase = createClientComponentClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (userId) {
        setUserId(userId);
        console.log('CRM: User ID set:', userId);
      } else {
        console.warn('CRM: No authenticated user found');
      }
      
      // Fetch subordinates after setting user ID
      await fetchSubordinates();
    };
    
    checkAuthAndFetch();
  }, [fetchSubordinates, setUserId]);

  const handleAdd = () => {
    form.validateFields().then(async (values) => {
      await addSubordinate({
        name: values.name,
        role: values.role,
        department: values.department,
        traits: ['New'], // Placeholder for parsed traits
        lastOneOnOne: undefined,
      });
      setIsModalVisible(false);
      form.resetFields();
      message.success('Subordinate added successfully');
    });
  };

  const showDetail = (sub: Subordinate) => {
    setSelectedSub(sub);
    setDrawerVisible(true);
  };

  const handlePdfUpload = async (file: File) => {
    if (!selectedSub) return false;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subordinateId', selectedSub.id);

    try {
      const response = await fetch('/api/pdf/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success && Array.isArray(result.traits)) {
        // Update subordinate with extracted traits
        await updateSubordinate(selectedSub.id, {
          traits: result.traits
        });
        message.success(`PDF analyzed successfully. Extracted ${result.traits.length} traits.`);
        return true;
      } else {
        message.error(result.error || 'Failed to analyze PDF');
        return false;
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error('Upload failed. Please try again.');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (text: string, record: Subordinate) => <a onClick={() => showDetail(record)}>{text}</a> },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { 
      title: 'Traits', 
      dataIndex: 'traits', 
      key: 'traits',
      render: (traits: string[]) => (
        <>
          {traits.map(tag => <Tag color="blue" key={tag}>{tag}</Tag>)}
        </>
      )
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Subordinate Management (CRM)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Add Subordinate
        </Button>
      </div>

      <Card variant="borderless">
        <Table dataSource={subordinates} columns={columns} rowKey="id" />
      </Card>

      <Modal
        title="Add New Subordinate"
        open={isModalVisible}
        onOk={handleAdd}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
             <Select>
                <Option value="Development">Development</Option>
                <Option value="Sales">Sales</Option>
                <Option value="Marketing">Marketing</Option>
                <Option value="Design">Design</Option>
             </Select>
          </Form.Item>
           <Form.Item name="role" label="Role" rules={[{ required: true }]}>
             <Input />
           </Form.Item>
          <Form.Item label="Trait Analysis (PDF Upload)">
            <Upload>
              <Button icon={<UploadOutlined />}>Upload Evaluation PDF</Button>
            </Upload>
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              * AI will analyze the PDF and extract traits automatically.
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Subordinate Details"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        // width={500}
        size="large"
      >
        {selectedSub && (
          <Descriptions title="User Info" bordered column={1} layout="vertical">
            <Descriptions.Item label="Name">{selectedSub.name}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedSub.department}</Descriptions.Item>
             <Descriptions.Item label="Role">{selectedSub.role}</Descriptions.Item>
            <Descriptions.Item label="Detected Traits">
                {selectedSub.traits.length > 0 ? selectedSub.traits.map(t => <Tag key={t}>{t}</Tag>) : "No traits analyzed yet."}
            </Descriptions.Item>
            <Descriptions.Item label="Analysis Data">
                <Spin spinning={uploading}>
                  <Upload
                    accept=".pdf"
                    showUploadList={false}
                    customRequest={async ({ file }) => {
                      const success = await handlePdfUpload(file as File);
                      // Antd Upload expects `onSuccess` or `onError` callbacks
                      // We handle errors in handlePdfUpload
                      return success;
                    }}
                    disabled={uploading}
                  >
                    <Button type="dashed" icon={<FilePdfOutlined />}>
                      {uploading ? 'Analyzing...' : 'Upload & Analyze PDF'}
                    </Button>
                  </Upload>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    Upload a PDF evaluation report. AI will extract personality traits.
                  </div>
                </Spin>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
