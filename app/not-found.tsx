'use client'

import React from 'react';
import Layout from '@/components/layout';
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <Layout
      width="min"
      title="页面未找到"
      metaDescription="抱歉，您访问的页面不存在。"
    >
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <h1 className="text-4xl font-bold">页面未找到</h1>
        <p className="text-lg text-muted-foreground">抱歉，您访问的页面不存在。</p>
        <Button size="sm" onClick={() => window.location.href = '/'}>
          前往首页
        </Button>
      </div>
    </Layout>
  );
};

export default NotFound;