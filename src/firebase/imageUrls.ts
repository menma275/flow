import { storage } from './firebase-config'
import { ref, listAll, getDownloadURL, StorageReference } from 'firebase/storage'

async function ImageUrls(): Promise<string[]> {
  try {
    const folderRef: StorageReference = ref(storage, "images");
    const res = await listAll(folderRef);

    const urlPromises: Promise<string>[] = res.items.map((itemRef) =>
      getDownloadURL(itemRef)
    );

    const urls: string[] = await Promise.all(urlPromises);
    return urls;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export default ImageUrls
