import type { AxiosError } from 'axios';
import i18n from '@/i18n';

const { t } = i18n.global;

export default (err: AxiosError) => {
  const { response } = err;

  if (response) {
    const data = response.data as { code: string; data: any; msg: string };
    err.code = data.code != null ? data.code : String(response.status);

    let msg = t(`response.statusCode${response.status}`);
    if (msg === `response.statusCode${response.status}`) {
      msg = `${t('response.defaultStatusCode')}(${response.status})!`;
    }

    err.message = msg;
  }

  return err;
};
