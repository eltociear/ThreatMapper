import { useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Checkbox, Radio, TextInput } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
  ModelSecretScanTriggerReq,
} from '@/api/generated';
import { NodeType } from '@/features/onboard/pages/ChooseScan';
import { ApiError, makeRequest } from '@/utils/api';

export enum SecretScanActionEnumType {
  SCAN_SECRET = 'scan_secret',
}

type ScanConfigureFormProps = {
  wantAdvanceOptions: boolean;
  data: {
    nodeIds: string[];
    images: string[];
    nodeType: NodeType | ('cluster' | 'host' | 'image' | 'registry' | 'imageTag');
  };
  onSuccess: (data?: { nodeType: string; bulkScanId: string }) => void;
};

type ScanActionReturnType = {
  message?: string;
  success: boolean;
  data?: {
    nodeType: string;
    bulkScanId: string;
  };
};

export const scanSecretApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType | null> => {
  const formData = await request.formData();
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const _images = formData.get('_images')?.toString().split(',') ?? [];
  const nodeType = formData.get('_nodeType')?.toString() ?? '';

  const scanInterval = formData.get('scanInterval')?.toString() ?? '';
  const scanEveryday = formData.get('scanEveryday')?.toString() ?? '';
  const imageTag = formData.get('imageTag')?.toString() ?? '';
  const priorityScan = formData.get('priorityScan')?.toString() ?? '';

  let filter_in = null;
  let _nodeType = nodeType;

  if (nodeType === 'imageTag') {
    _nodeType = 'image';
  } else if (nodeType === 'kubernetes_cluster') {
    _nodeType = 'cluster';
  } else if (nodeType === 'image') {
    _nodeType = 'registry';
    if (imageTag !== '') {
      filter_in = {
        docker_image_name: _images,
        docker_image_tag: [imageTag],
      };
    } else {
      filter_in = {
        docker_image_name: _images,
      };
    }
  } else if (nodeType === 'registry') {
    if (imageTag !== '') {
      filter_in = {
        docker_image_tag: [imageTag],
      };
    }
  }

  const requestBody: ModelSecretScanTriggerReq = {
    filters: {
      cloud_account_scan_filter: { filter_in: null },
      kubernetes_cluster_scan_filter: { filter_in: null },
      container_scan_filter: { filter_in: null },
      host_scan_filter: { filter_in: null },
      image_scan_filter: {
        filter_in,
      },
    },
    node_ids: nodeIds.map((nodeId) => ({
      node_id: nodeId,
      node_type: _nodeType as ModelNodeIdentifierNodeTypeEnum,
    })),
  };

  const r = await makeRequest({
    apiFunction: getSecretApiClient().startSecretScan,
    apiArgs: [
      {
        modelSecretScanTriggerReq: requestBody,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanActionReturnType>({
        success: false,
      });
      if (r.status === 400 || r.status === 409) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  toast('Scan has been sucessfully started');
  return {
    success: true,
    data: {
      bulkScanId: r.bulk_scan_id,
      nodeType,
    },
  };
};

export const SecretScanConfigureForm = ({
  data,
  onSuccess,
  wantAdvanceOptions,
}: ScanConfigureFormProps) => {
  const [priorityScan, setPriorityScan] = useState(false);
  const [autoCheckandScan, setAutoCheckandScan] = useState(false);
  const [imageTag, setImageTag] = useState('latest');
  const fetcher = useFetcher<ScanActionReturnType>();

  const { state, data: fetcherData } = fetcher;

  useEffect(() => {
    let data = undefined;
    if (fetcherData?.success) {
      if (fetcher.data) {
        data = fetcher.data.data;
      }
      onSuccess(data);
    }
  }, [fetcherData]);

  return (
    <fetcher.Form
      className="flex flex-col px-6 py-2 mb-4"
      method="post"
      action="/data-component/scan/secret"
    >
      <input type="text" name="_nodeIds" hidden readOnly value={data.nodeIds.join(',')} />
      <input type="text" name="_nodeType" readOnly hidden value={data.nodeType} />
      {data.images && (
        <input type="text" name="_images" hidden readOnly value={data.images.join(',')} />
      )}
      {fetcherData?.message && (
        <p className="text-red-500 text-md py-3">{fetcherData.message}</p>
      )}
      <div className="flex">
        {wantAdvanceOptions && (
          <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
        )}

        <Button
          disabled={state === 'loading'}
          loading={state === 'loading'}
          size="sm"
          color="primary"
          className="ml-auto"
          type="submit"
        >
          Start Scan
        </Button>
      </div>
      {wantAdvanceOptions && (
        <div className="flex flex-col gap-y-6">
          <Checkbox
            name="priorityScan"
            label="Priority Scan"
            checked={priorityScan}
            onCheckedChange={(checked: boolean) => {
              setPriorityScan(checked);
            }}
          />
          {data.nodeType !== 'imageTag' && (
            <Radio
              name="imageTag"
              value={imageTag}
              options={[
                { label: 'Scan last pushed tag', value: 'recent' },
                { label: 'Scan by "latest" tag', value: 'latest' },
                { label: 'Scan all image tags', value: 'all' },
              ]}
              onValueChange={(value) => {
                setImageTag(value);
              }}
            />
          )}
          <TextInput
            className="min-[200px] max-w-xs"
            label="Scan interval in days (optional)"
            type={'text'}
            sizing="sm"
            name="scanInterval"
            placeholder=""
          />
          <Checkbox
            name="scanEveryday"
            label="Check and scan for new images every day"
            checked={autoCheckandScan}
            onCheckedChange={(checked: boolean) => {
              setAutoCheckandScan(checked);
            }}
          />
        </div>
      )}
    </fetcher.Form>
  );
};