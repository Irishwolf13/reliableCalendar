import React, { useEffect, useRef, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton, IonAlert, IonMenu, IonToast, IonIcon, IonItem, IonLabel, IonToggle, IonInput, IonDatetime, IonSelectOption, IonSelect, IonDatetimeButton, IonModal, IonCheckbox } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../firebase/AuthContext';
import { 
  deleteLastEventByJobID, 
  subscribeToJobs, 
  updateJobEventDatesByNumberID, 
  updateShippingOrInHandDate, 
  editSiteInfoDocument,
  updateArrayElement,
  removeArrayElement,
  getCalendarNames,
  addCalendarName,
  removeCalendarName,
  createJobOnFirebase,
  deleteJobById,
  updateEventHoursForDate,
  deleteJobByCalendarName,
  getCalendarBackgroundColor,
  updateCalendarBackgroundColor,
  getEventColors,
  updateEventColor,
} from '../../firebase/controller';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { menuController } from '@ionic/core/components';
import { menuOutline } from 'ionicons/icons';
import './Calendar.css';
import ColorPicker from '../../components/ColorPicker';

interface Job {
  jobID: string;
  title: string;
  backgroundColor: string;
  eventDates: string[];
  eventHours: number[];
  hours: number;
  shippingDate: string | null;
  inHandDate: string | null;
  calendarName:string;
  companyName: string;
}

interface CalendarEvent {
  jobID: string;
  title: string;
  date: string;
  backgroundColor: string;
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const history = useHistory();
  const calendarRef = useRef<FullCalendar | null>(null);
  const inputRef = useRef<HTMLIonInputElement>(null);

  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('');

  const [myTitle, setMyTitle] = useState('');
  const [myJobNumber, setMyJobNumber] = useState('');
  const [myJobDate, setMyJobDate] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState<string>('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [calendarNameToDelete, setCalendarNameToDelete] = useState<string | null>(null);
  
  // New Job useStates, should be made into an object at some point
  const [newJobTitle, setNewJobTitle] = useState<string>('');
  const [newJobCompanyName, setNewJobCompanyName] = useState<string>('');
  const [newJobSelectedDate, setNewJobSelectedDate] = useState<string | null>('');
  const [newJobShippingDate, setNewJobShippingDate] = useState<string | null>(null);
  const [newJobInHandDate, setNewJobInHandDate] = useState<string | null>(null);
  const [newJobColor, setNewJobColor] = useState<string>('');
  const [newJobCalendar, setNewJobCalendar] = useState<string>(''); 
  const [newJobTotalHours, setNewJobTotalHours] = useState<number | null>(null);
  const [newJobPerDayHours, setNewJobPerDayHours] = useState<number | null>(null);
  const [newJobEndDate, setNewJobEndDate] = useState<boolean>(false);
  const [newJobScheduled, setNewJobScheduled] = useState<boolean>(true);
  const [newJobStages, setNewJobStages] = useState({
    cnc: false,
    hardware: false,
    powderCoating: false,
    productTag: false,
    qualityTag: false
  });
  const resetValues = () => {
    setNewJobTitle('');
    setNewJobCompanyName('');
    setNewJobSelectedDate('');
    setNewJobShippingDate(null);
    setNewJobInHandDate(null);
    setNewJobColor('');
    setNewJobCalendar(''); 
    setNewJobTotalHours(null);
    setNewJobPerDayHours(null);
    setNewJobEndDate(false);
    setNewJobScheduled(true);
    setShowShippingCalendar(false);
    setShowInHandCalendar(false);
  }
  const [showShippingCalendar, setShowShippingCalendar] = useState<boolean>(false);
  const [showInHandCalendar, setShowInHandCalendar] = useState<boolean>(false);
  const [isPerDayHoursOpen, setIsPerDayHoursOpen] = useState<boolean>(false);
  
  const [hoursPerDay, setHoursPerDay] = useState<number | null>(null);
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string | null>('');

  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [calendarColors, setCalendarColors] = useState<Record<string, string>[]>([]);
  const [calendarNames, setCalendarNames] = useState<string[]>([]);
  const [activeCalendars, setActiveCalendars] = useState<{[key: string]: boolean}>({});

  const handleColorSelect = (selectedColor: string) => {
    setBackgroundColor(selectedColor);
    if (user && user.email) updateCalendarBackgroundColor(user.email, selectedColor)
  };
  
  const handleEventColorSelect = (colorName: string) => async (newColorValue: string) => {
    await updateEventColor(colorName, newColorValue);
  };

  //////////////////////////////  LOGGING OUT  //////////////////////////////
  const handleLogout = async () => {
    try { await signOut(auth); history.push('/login');
    } catch (error) { console.error('Error signing out:', error); }
  };

  //////////////////////////////  USE EFFECTS  //////////////////////////////
  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobs) => { setMyJobs(jobs); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEventColors = async () => {
      try {
        const colors = await getEventColors();
        if (colors) { setCalendarColors(colors); }
      } catch (error) { console.error("Error fetching event colors:", error); }
    };
    fetchEventColors();
  }, []);

  useEffect(() => {
    const fetchBackgroundColor = async () => {
      if (user && user.email) {
        try {
          const myColor = await getCalendarBackgroundColor(user.email);
          
          if (myColor) {
            setBackgroundColor(myColor);
          } else {
            setBackgroundColor('#000000');
          }
        } catch (error) {
          console.error("Error fetching background color:", error);
          setBackgroundColor('#000000'); // Fallback color in case of error
        }
      }
    };

    fetchBackgroundColor();
  }, [user]);
  
  useEffect(() => {
    getCalendarNames().then((names) => {
      setCalendarNames(names);
      const initialActiveState = names.reduce((acc, name) => ({ ...acc, [name]: true }), {});

      setActiveCalendars(initialActiveState);
    }).catch((error) => {
      console.error("Error fetching calendar names:", error);
    });
  }, [refresh]);
  
  //////////////////////////////  CALENDAR NAMES  //////////////////////////////
  const handleAddCalendar = async () => {
    if (newCalendarName.trim() !== '') {
      await addCalendarName(newCalendarName.trim());

      // Optionally update local state or refetch the calendar names
      setCalendarNames((prevNames) => [...prevNames, newCalendarName.trim()]);
      setNewCalendarName(''); // Clear the input field after adding
    }
  };

  const handleDeleteCalendar = (name: string) => {
    setCalendarNameToDelete(name);
    setShowDeleteAlert(true);
  };

  const confirmDeleteCalendar = async () => {
    if (calendarNameToDelete) {
      try {
        await deleteJobByCalendarName(calendarNameToDelete);
        await removeCalendarName(calendarNameToDelete);
        
        setCalendarNames((current) =>
          current.filter((calendarName) => calendarName !== calendarNameToDelete)
        );
        console.log(`Deleted calendar name: ${calendarNameToDelete}`);
      } catch (error) {
        console.error("Error deleting calendar name:", error);
      }
      setCalendarNameToDelete(null);
    }
    setShowDeleteAlert(false);
  };

  const cancelDeleteCalendar = () => {
    setCalendarNameToDelete(null);
    setShowDeleteAlert(false);
  };

  //////////////////////////////  FILTER OUT CALENDARS  //////////////////////////////
  interface Event { jobID: string; title: string; date: string; backgroundColor: string;}

  useEffect(() => {
    const isShippingActive = activeCalendars['shipping'];
    const isInHandActive = activeCalendars['shipping'];
    
    const regularEvents: Event[] = myJobs.reduce((acc: Event[], job) => {
      let remainingHours = job.hours;

      const expandedEvents = job.eventDates.map((date, index) => {
        const eventHour = job.eventHours[index];
        const applicableHours = Math.min(eventHour, remainingHours);
        const eventTitle = `${job.title} : ${remainingHours} / ${applicableHours} `;

        if (remainingHours >= applicableHours) {
          remainingHours -= applicableHours;
        }

        return {
          jobID: job.jobID,
          title: eventTitle,
          date,
          backgroundColor: job.backgroundColor,
        };
      });

      if (activeCalendars[job.calendarName]) { acc = acc.concat(expandedEvents); }
      
      // Handle shippingDate
      if (job.shippingDate) {
        if (isShippingActive || activeCalendars[job.calendarName]) {
          acc.push({
            jobID: job.jobID,
            title: `${job.title}: Shipping`,
            date: job.shippingDate,
            backgroundColor: job.backgroundColor,
          });
        }
      }
      // Handle inHandDate
      if (job.inHandDate) {
        if (isInHandActive || activeCalendars[job.calendarName]) {
          acc.push({
            jobID: job.jobID,
            title: `${job.title}: In-Hand`,
            date: job.inHandDate,
            backgroundColor: job.backgroundColor,
          });
        }
      }

      return acc;

    }, []);

    // Set the filtered events
    setFilteredEvents(regularEvents);

  }, [myJobs, activeCalendars]);

  //////////////////////////////  FORMATE DATE FOR VIEWING  //////////////////////////////
  const formatDateToView = (dateStr: string): string => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
          throw new Error('Invalid date string');
      }
      date.setDate(date.getDate() + 1);
      const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
  };


  //////////////////////////////  HANDLE DATE CLICKED  //////////////////////////////
  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.dateStr);
    const dayOfWeek = clickedDate.getDay();
    if (dayOfWeek === 6 || dayOfWeek === 5) return

    // Continue with the existing logic for weekdays
    const formattedDate = formatDateToView(arg.dateStr);
    setNewJobSelectedDate(formattedDate);
    openSecondMenu();
  };

  const createNewJob = async () => {
    // Filter out the stages that are true and convert them to false
    const filteredStages = Object.fromEntries(
      Object.entries(newJobStages)
        .filter(([_, value]) => value)
        .map(([key, _]) => [key, false])
    );

    const newJobInformation = {
      backgroundColor: newJobColor || 'Blue',
      calendarName: newJobCalendar || 'main',
      hours: newJobTotalHours || 0,
      perDayHours: newJobPerDayHours || 0,
      title: newJobTitle || 'New Job',
      companyName: newJobCompanyName,
      startDate: newJobSelectedDate,
      endDate: newJobEndDate,
      scheduled: newJobScheduled,
      shippingDate: newJobShippingDate,
      inHandDate: newJobInHandDate,
      stages: filteredStages, // Pass the transformed stages
    };

    await menuController.close('newJobMenu');
    await createJobOnFirebase(newJobInformation);
  };

  //////////////////////////////  HANDLE EVENTS BEING CLICKED  //////////////////////////////
  const handleEventClick = (info:any) => {
    const { event } = info;
    const [titleBeforeColon] = event.title.split(':');

    const [, perDayHoursString] = event.title.split('/');
    const perDayHours = parseFloat(perDayHoursString);
    setHoursPerDay(perDayHours)

    setMyTitle(titleBeforeColon);
    setMyJobNumber(event.extendedProps.jobID);
    setCurrentSelectedDate(event.startStr)

    const formattedDate = formatDateToView(event.startStr);
    setMyJobDate(formattedDate);

    setIsPerDayHoursOpen(true)
  };

  const showJobDetails = () => {
    setIsPerDayHoursOpen(false)
    openFirstMenu()
  }

  const handlePerDayValueChange = () => {
    if(hoursPerDay && currentSelectedDate) updateEventHoursForDate(myJobNumber, hoursPerDay, currentSelectedDate);
  };

  //////////////////////////////  TOGGLE HANDLER  //////////////////////////////
  const handleToggleCalendar = (calendarName: string) => {
    setActiveCalendars(prevState => ({
      ...prevState,
      [calendarName]: !prevState[calendarName],
    }));
  };

  //////////////////////////////  DROP EVENTS  //////////////////////////////
  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const jobId = event.extendedProps.jobID;
    const myStartDate = info.event.startStr;

    const jobToUpdate = myJobs.find((job) => job.jobID === jobId);

    if (!jobToUpdate) return;

    // Check the event title to determine its type
    const isShippingDateEvent = event.title.includes('Shipping');
    const isInHandDateEvent = event.title.includes('In-Hand');

    if (isShippingDateEvent || isInHandDateEvent) {
      try {
        const invalidDate = jobToUpdate.eventDates.some(
          (eventDate) => new Date(myStartDate) <= new Date(eventDate)
        );

        if (invalidDate) {
          setToastText(`Move rejected: Date cannot be on or before any event date.`);
          setShowToast(true);
          info.revert();
          return;
        }

        // Use the title to identify the date type instead of relying solely on the old event date
        const dateType = isShippingDateEvent ? 'shippingDate' : 'inHandDate';

        await updateShippingOrInHandDate(jobId, myStartDate, dateType);

        setMyJobs((prevJobs) =>
          prevJobs.map((job) =>
            job.jobID === jobId
              ? {
                  ...job,
                  [dateType]: myStartDate,
                }
              : job
          )
        );
      } catch (error) {
        console.error('Failed to update date:', error);
        info.revert();
      }
    } else {
      // Existing logic for handling regular event drops
      if (jobToUpdate) {
        const eventDateFound = jobToUpdate.eventDates.includes(myStartDate);
        const firstEventDate = jobToUpdate.eventDates[0];
        
        if (info.oldEvent.startStr !== firstEventDate) {
          if (eventDateFound && new Date(info.oldEvent.startStr) > new Date(myStartDate)) {
            setToastText("Move rejected: Event can not be moved before previous job events.");
            setShowToast(true)
            info.revert();
            return;
          }
          if (new Date(myStartDate) < new Date(firstEventDate)) {
            setToastText("Move rejected: Event can not be moedd before previous job events.");
            setShowToast(true)
            info.revert();
            return;
          }
        }

        // Logic to update event dates and further checks
        setMyJobs((prevJobs) => {
          const newJobs = prevJobs.map((job) => {
            if (job.jobID === jobId) {
              const oldStartDateStr = info.oldEvent.start.toISOString().substring(0, 10);
              const newStart = new Date(event.start);

              const movedDateIndex = job.eventDates.indexOf(oldStartDateStr);

              if (movedDateIndex !== -1) {
                const updatedEventDates = [...job.eventDates];

                const getNextWeekday = (date: Date): Date => {
                  let nextDate = new Date(date);
                  while (nextDate.getDay() === 6 || nextDate.getDay() === 0) {
                    nextDate.setDate(nextDate.getDate() + 1);
                  }
                  return nextDate;
                };

                let currentDate = getNextWeekday(newStart);

                for (let i = movedDateIndex; i < updatedEventDates.length; i++) {
                  updatedEventDates[i] = currentDate.toISOString().substring(0, 10);
                  currentDate.setDate(currentDate.getDate() + 1);
                  currentDate = getNextWeekday(currentDate);
                }
                if (job.shippingDate){
                  const shippingDate = new Date(job.shippingDate);
                  const invalidAfterMove = updatedEventDates.some(
                    (eventDate) => new Date(eventDate) >= shippingDate
                  );
                  if (invalidAfterMove) {
                    setToastText("Move rejected: Updated event dates would be on or after the shipping date.");
                    setShowToast(true)
                    info.revert();
                    return job; // Return early if move should be rejected
                  }
                }

                
                updateJobEventDatesByNumberID(jobId, updatedEventDates);

                return {
                  ...job,
                  eventDates: updatedEventDates,
                };
              }
            }
            return job;
          });
          return newJobs;
        });
      }
    }
  };

  //////////////////////////////  RESIZE EVENTS  //////////////////////////////
  const handleEventResize = (info: any) => {
    const { event } = info;
    const jobID = event.extendedProps.jobID;
    const job = myJobs.find(j => j.jobID === jobID);
    const isLastEvent = job?.eventDates[job.eventDates.length - 1] === event.startStr;

    if (job) {
      if (!isLastEvent) { info.revert(); return; };

      if (job.shippingDate){
        if (event.start && event.end) {
          const shippingDate = new Date(job.shippingDate);
          shippingDate.setDate(shippingDate.getDate() + 1);
          
          if (job.inHandDate){
            const inHandDate = new Date(job.inHandDate);
            inHandDate.setDate(inHandDate.getDate() + 1);

            if (event.end >= shippingDate || event.end >= inHandDate) {
              setToastText("Resize rejected: Resizing would extend onto or beyond the date limits.");
              setShowToast(true);
              info.revert(); return;
            }
          }
          const differenceInTime = event.end.getTime() - event.start.getTime();
          const totalDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
      
          const newEvents: CalendarEvent[] = [];
          for (let i = 0; i < totalDays; i++) {
            const newDate = new Date(event.start);
            newDate.setDate(event.start.getDate() + i);
      
            const dayOfWeek = newDate.getDay();
            if (dayOfWeek === 6 || dayOfWeek === 0) { continue; }; // Skip weekends 
      
            newEvents.push({
              jobID: event.extendedProps.jobID,
              title: event.title,
              date: newDate.toISOString().substring(0, 10),
              backgroundColor: event.backgroundColor,
            });
          };
      
          setMyJobs(prevJobs => {
            const newJobs = prevJobs.map(job => {
              if (job.jobID === event.extendedProps.jobID) {
                const newDates = newEvents.map(ev => ev.date);
                const updatedEventDates = [...new Set([...job.eventDates, ...newDates])];
      
                // Update the Firestore document
                updateJobEventDatesByNumberID(job.jobID, updatedEventDates);
      
                return {
                  ...job,
                  eventDates: updatedEventDates,
                };
              };
              return job;
            });
            return newJobs;
          });
      
          const calendarApi = calendarRef.current?.getApi();
          if (calendarApi) {
            event.remove();
            newEvents.forEach(newEvent => calendarApi.addEvent(newEvent));
          };
        };
      }
    };
  };

  //////////////////////////////  DELETE FUNCTIONS  //////////////////////////////
  const [showDeleteEventAlert, setShowDeleteEventAlert] = useState(false);
  const [showDeleteJobAlert, setShowDeleteJobAlert] = useState(false);
  const [selectedEventID, setSelectedEventID] = useState<string | null>(null);

  const handleDeleteEvent = (event: any) => {
    setSelectedEventID(event.extendedProps.jobID);
    setShowDeleteEventAlert(true);
  };

  const handlePhoneDeleteEvent = () => {
    setSelectedEventID(myJobNumber);
    setShowDeleteEventAlert(true);
  }

  const confirmDeleteEvent = () => {
    if (selectedEventID !== null) {
      deleteLastEventByJobID(selectedEventID);
      setSelectedEventID(null); // Clear selected event ID after deletion
    }
    setShowDeleteEventAlert(false);
  };

  const renderDeleteEventButton = (eventInfo: any) => {
    const myJobID = eventInfo.event.extendedProps.jobID;
    const myEventDate = eventInfo.event.startStr;
    const job = myJobs.find(j => j.jobID === myJobID);
    const isLastEvent = job?.eventDates[job.eventDates.length - 1] === myEventDate;

    return (
      <div className='calendarEvent' style={{ color: '#ffffff'}}>
        <span>{eventInfo.event.title}</span>
        {isLastEvent && (
          <button className='deleteButton'
            onClick={(e) => {
              e.stopPropagation(); // Prevent event click from also triggering
              handleDeleteEvent(eventInfo.event);
            }}
          > X </button>
        )}
      </div>
    );
  };

  const confirmDeleteJob = async () => {
    deleteJobById(myJobNumber)
    setShowDeleteJobAlert(false);
    await menuController.close('selectedJobMenu');
  };


  //////////////////////////////  TOGGLE STAGES  //////////////////////////////
  // Function to update the boolean value of a specific stage
  const handleToggleChange = (stage: string, isChecked: boolean) => {
    setNewJobStages((prevStages) => ({
      ...prevStages,
      [stage]: isChecked
    }));
  };

  // Function to convert camelCase to Title Case
  const formatStageName = (stage:string) => {
    return stage
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  //////////////////////////////  SIDE MENUS  //////////////////////////////
  async function openFirstMenu() { await menuController.open('selectedJobMenu'); }
  async function openSecondMenu() { await menuController.open('newJobMenu'); }
  async function openCalendarMenu() { await menuController.open('calendarMenu'); }
  const handleMenuDismissed = () => { resetValues() };

  //////////////////////////////  SIDE MENU CALENDARS //////////////////////////////
  const [isShippingDateOpen, setIsShippingDateOpen] = useState<boolean>(false);
  const [isInHandDateOpen, setIsInHandDateOpen] = useState<boolean>(false);
  
  const handleShippingDateChange = (e: CustomEvent) => {
    setNewJobShippingDate(e.detail.value!);
    setIsShippingDateOpen(false);
  };

  const handleInHandDateChange = (e: CustomEvent) => {
    setNewJobInHandDate(e.detail.value!);
    setIsInHandDateOpen(false);
  };

  const setToNull = (myOption:string, myBool:boolean) => {
    if (myOption === 'shipping') {
      if (myBool) {
        setShowShippingCalendar(true)
      } else {
        setShowShippingCalendar(false)
        setNewJobShippingDate(null)
      }
    }
    if (myOption === 'inHand') {
      if (myBool) {
        setShowInHandCalendar(true)
      } else {
        setShowInHandCalendar(false)
        setNewJobInHandDate(null)
      }
    }
  }

  // Handle Enter key press for perDay Modal
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePerDayValueChange();
      setIsPerDayHoursOpen(false);
    }
  };

  const handleMenuClose = async () => { await menuController.close('calendarMenu'); };

  return (
    <>
      <IonModal
        isOpen={isPerDayHoursOpen}
        onDidDismiss={() => setIsPerDayHoursOpen(false)}
        keepContentsMounted={true}
        className="perDayModal"
      >
          <IonItem>
            <IonInput
              ref={inputRef}
              labelPlacement="stacked"
              label="Per Day Hours"
              type="number"
              inputmode="numeric"
              value={hoursPerDay?.toString()}
              placeholder={hoursPerDay?.toString()}
              onIonInput={(e) => setHoursPerDay(parseFloat(e.detail.value!))}
              onKeyDown={handleKeyPress}
            />
          </IonItem>
            <IonButton
              onClick={() => {
                handlePerDayValueChange();
                setIsPerDayHoursOpen(false);
              }}
            >OK</IonButton>
            <IonButton onClick={showJobDetails}>Job Details</IonButton>
            <IonButton onClick={handlePhoneDeleteEvent} className='phoneOnly' color='danger'>Remove Day</IonButton>

      </IonModal>

      <IonMenu menuId="selectedJobMenu" contentId="main-content" swipeGesture={false}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{myJobDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div>{myTitle}</div>
          <div>
            
          </div>
        </IonContent>
        <IonButton color="danger" onClick={() => setShowDeleteJobAlert(true)}>Delete Job</IonButton>
      </IonMenu>

      <IonMenu menuId="newJobMenu" contentId="main-content" onIonDidClose={handleMenuDismissed} swipeGesture={false}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{newJobSelectedDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonLabel>Job Options</IonLabel>
          <IonItem>
            <IonLabel slot="start">Title</IonLabel>
            <IonInput
              value={newJobTitle}
              placeholder="Title"
              onIonChange={e => setNewJobTitle(e.detail.value!)}
            />
          </IonItem>
          <IonItem>
            <IonLabel slot="start">Company</IonLabel>
            <IonInput
              value={newJobCompanyName}
              placeholder="Name"
              onIonChange={e => setNewJobCompanyName(e.detail.value!)}
            />
          </IonItem>

          <IonItem>
            <IonLabel slot="start">Total Hours</IonLabel>
            <IonInput
              type="number"
              inputmode="numeric"
              placeholder='0'
              value={newJobTotalHours}
              onIonChange={e => setNewJobTotalHours(parseFloat(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel slot="start">PerDay</IonLabel>
            <IonInput
              type="number"
              inputmode="numeric"
              placeholder='0'
              value={newJobPerDayHours}
              onIonChange={e => setNewJobPerDayHours(parseFloat(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Job Scheduled</IonLabel>
            <IonToggle
              slot="end"
              checked={newJobScheduled}
              onIonChange={e => setNewJobScheduled(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Shipping Date</IonLabel>
            <IonToggle
              slot="end"
              checked={showShippingCalendar}
              onIonChange={e => setToNull('shipping', e.detail.checked)}
            />
          </IonItem>

          {showShippingCalendar && (
            <IonItem>
              <IonDatetimeButton slot="end" datetime="shipping-datetime" onClick={() => setIsShippingDateOpen(true)}></IonDatetimeButton>

              <IonModal
                isOpen={isShippingDateOpen}
                onDidDismiss={() => setIsShippingDateOpen(false)}
                keepContentsMounted={true}
              >
                <IonDatetime
                  id="shipping-datetime"
                  presentation="date"
                  value={newJobShippingDate}
                  onIonChange={handleShippingDateChange}
                />
              </IonModal>
            </IonItem>
          )}

          <IonItem>
            <IonLabel>InHand Date</IonLabel>
            <IonToggle
              slot="end"
              checked={showInHandCalendar}
              onIonChange={e => setToNull('inHand', e.detail.checked)}
            />
          </IonItem>

          <div className='menuPadding'></div>
          <IonLabel>Requirements</IonLabel>
          {Object.entries(newJobStages).map(([stage, isActive], index) => (
            <IonItem key={index}>
              <IonLabel>{formatStageName(stage)}</IonLabel>
              <IonToggle
                slot="end"
                checked={isActive}
                onIonChange={(e) => handleToggleChange(stage, e.detail.checked)}
              />
            </IonItem>
          ))}

          {showInHandCalendar && (
            <IonItem>
              <IonLabel></IonLabel>
              <IonDatetimeButton datetime="inhand-datetime" onClick={() => setIsInHandDateOpen(true)}></IonDatetimeButton>

              <IonModal
                isOpen={isInHandDateOpen}
                onDidDismiss={() => setIsInHandDateOpen(false)}
                keepContentsMounted={true}
              >
                <IonDatetime
                  id="inhand-datetime"
                  presentation="date"
                  value={newJobInHandDate}
                  onIonChange={handleInHandDateChange}
                />
              </IonModal>
            </IonItem> 
          )}
          <div className='menuPadding'></div>

          <IonLabel>Calendar Options</IonLabel>
          <IonItem>
            <IonLabel>Calendar Name</IonLabel>
            <IonSelect
              slot="end"
              value={newJobCalendar}
              placeholder="Select"
              onIonChange={e => setNewJobCalendar(e.detail.value)}
              interface="popover" // Use popover for immediate selection
            >
              {calendarNames.map(name => (
                <IonSelectOption key={name} value={name}>
                  {name}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Calendar Color</IonLabel>
            <IonSelect
              slot="end"
              value={newJobColor}
              placeholder="Select"
              onIonChange={(e) => setNewJobColor(e.detail.value)}
              interface="popover" // Use popover for immediate selection
            >
              {calendarColors.map((colorObject, index) => {
                const [[colorName, colorValue]] = Object.entries(colorObject);
                return (
                  <IonSelectOption key={index} value={colorValue}>
                    {colorName}
                  </IonSelectOption>
                );
              })}
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonLabel>Calculate From End Date</IonLabel>
            <IonToggle
              slot="end"
              checked={newJobEndDate}
              onIonChange={e => setNewJobEndDate(e.detail.checked)}
            />
          </IonItem>
        </IonContent>
          <IonButton onClick={createNewJob}>Create Job</IonButton>
      </IonMenu>

      <IonMenu side='end' menuId="calendarMenu" contentId="main-content" swipeGesture={false}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot='end'>
              <IonButton onClick={handleMenuClose}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className='flex-basis'>
          <IonItem>
            <IonLabel>Background</IonLabel>
            <ColorPicker 
              onColorSelect={handleColorSelect} 
              initialColor={backgroundColor} // Pass the initial color
            />
          </IonItem>

            <h6>Calendar Names</h6>
            {calendarNames.map((name) => (
              <IonItem key={name}>
                <IonLabel>{name}</IonLabel>
                {name !== "main" && name !== 'shipping' && (
                  <IonButton  color="danger" slot="end" onClick={() => handleDeleteCalendar(name)}>X</IonButton>
                )}
              </IonItem>
            ))}
            <IonItem>
              <IonInput
                value={newCalendarName}
                placeholder="Enter new calendar name"
                onIonChange={(e) => setNewCalendarName(e.detail.value!)}
              />
              <IonButton color="success" onClick={handleAddCalendar}>+</IonButton>
            </IonItem>

            <h6>Event Color Selections</h6>
            {calendarColors.map((colorObject, index) => {
              const [[colorName, colorValue]] = Object.entries(colorObject);
              return (
                <IonItem key={index}>
                  <IonLabel>{colorName}</IonLabel>
                  <ColorPicker
                    initialColor={colorValue}
                    onColorSelect={handleEventColorSelect(colorName)}
                  />
                </IonItem>
              );
            })}

          </div>
        </IonContent>
        <IonButton onClick={handleLogout}>Logout</IonButton>
      </IonMenu>

      <IonPage id="main-content">
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
            </IonButtons>
              <IonTitle>Reliable Calendar</IonTitle>
            <IonButtons slot="end">
                <IonButton onClick={openCalendarMenu}>
                <IonIcon icon={menuOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <div className='mainPageHolder' style={{ backgroundColor: backgroundColor }}>
            <div className='calendarHolder'>
            <div className='checkBoxHolder'>
              {calendarNames.map((name) => (
                <div className='checkBoxes' key={name}>
                  <IonLabel className='checkBoxLables' >{name}</IonLabel>
                    <input
                      type="checkbox"
                      checked={activeCalendars[name]}
                      onChange={() => handleToggleCalendar(name)}
                    />
                </div>
              ))}
            </div>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridYear"
                height="86vh"
                editable={true}
                events={filteredEvents}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridYear,dayGridMonth,dayGridWeek,dayGridDay'
                }}
                eventDrop={handleEventDrop}
                eventClick={handleEventClick}
                eventResize={handleEventResize}
                eventContent={renderDeleteEventButton}
                dateClick={handleDateClick}
                />
            </div>
            
          </div>

          <IonAlert
            isOpen={showDeleteEventAlert}
            onDidDismiss={() => setShowDeleteEventAlert(false)}
            header={'Confirm Delete'}
            message={'Are you sure you want to delete this event?'}
            buttons={[
              { text: 'Cancel', role: 'cancel', handler: () => { setShowDeleteEventAlert(false);},},
              { text: 'Delete', handler: confirmDeleteEvent,},
            ]}
          />

          <IonAlert
            isOpen={showDeleteJobAlert}
            onDidDismiss={() => setShowDeleteJobAlert(false)}
            header={`Delete Job: ${myTitle}`}
            message={`Are you sure you want to delete ${myTitle}?`}
            buttons={[
              { text: 'Cancel', role: 'cancel', handler: () => { setShowDeleteJobAlert(false);},},
              { text: 'Delete', handler: confirmDeleteJob,},
            ]}
          />

          <IonAlert
            isOpen={showDeleteAlert}
            onDidDismiss={() => setShowDeleteAlert(false)}
            header={"Confirm Delete"}
            message={`Are you sure you want to delete the calendar "${calendarNameToDelete}"? This will delete all events on that calendar.`}
            buttons={[
              {
                text: "Cancel",
                role: "cancel",
                handler: cancelDeleteCalendar,
              },
              {
                text: "Delete",
                handler: confirmDeleteCalendar,
              },
            ]}
          />
        </IonContent>

        <IonToast
          isOpen={showToast}
          message={toastText}
          duration={3000}
          onDidDismiss={() => setShowToast(false)} // Reset the toast visibility
        />
        <IonFooter>
          <div className='footer'>© 2025 Dancing Goat Studios</div>
        </IonFooter>
      </IonPage>
    </>
  );
};

export default Calendar;
