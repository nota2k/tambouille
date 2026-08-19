import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { KEY_PATTERN as MIXCLOUD_KEY_PATTERN } from '../../mixcloud/mixcloud.service';
import { isIP } from 'node:net';

/**
 * `sourceRef` means two different things depending on `sourceType`, so it
 * cannot be checked by one regex. Validation dispatches on the sibling field.
 *
 * The remote branch does not resolve DNS — validators are synchronous, and a
 * lookup here would make every create wait on the network. It refuses a
 * literal IP address outright: no legitimate podcast or archive serves audio
 * from a bare address, so allowing them would only buy a way to point every
 * visitor's browser at an arbitrary host.
 */
@ValidatorConstraint({ name: 'sourceRef', async: false })
export class SourceRefConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    const sourceType = (args.object as { sourceType?: string }).sourceType;

    if (sourceType === 'mixcloud') return MIXCLOUD_KEY_PATTERN.test(value);

    if (sourceType === 'remote') {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return false;
      }
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (isIP(host)) return false;
      return true;
    }

    // `sourceRef` est ici l'URL de page SoundCloud, rendue verbatim dans un
    // `:href` par `MixDetailView` — Vue ne filtre pas les hrefs. La contrainte
    // doit donc refuser tout ce qui n'est pas une adresse https sur le
    // domaine SoundCloud, `javascript:` compris.
    if (sourceType === 'soundcloud') {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return false;
        const host = url.hostname.toLowerCase();
        return host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
      } catch {
        return false;
      }
    }

    return false;
  }

  defaultMessage(): string {
    return 'sourceRef is not valid for this sourceType';
  }
}
