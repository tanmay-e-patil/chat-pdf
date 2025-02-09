'use client';
import { Inbox } from 'lucide-react';
import {useDropzone} from 'react-dropzone';

const FileUpload = () => {
    const {getRootProps, getInputProps} = useDropzone({
        accept: {'application/pdf': ['.pdf']},
        maxFiles: 1,
        onDrop: acceptedFiles => {
            console.log(acceptedFiles);
        }
    });
    return (
        <div className='p-2 bg-white rounded-xl'>
            <div {...getRootProps({
                className: 'dropzone border-dashed border-2 border-gray-300 p-4 rounded-xl cursor-pointe flex flex-col items-center justify-center cursor-pointer'
            })}>
                <input {...getInputProps()} />
                <>
                <Inbox className='w-10 h-10 text-purple-600' />
                <p className='mt-2 text-sm text-slate-400'>Drop PDF Here</p>
                </>
        </div>
        </div>
    );
}

export default FileUpload;