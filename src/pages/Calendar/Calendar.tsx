import React, { useEffect, useRef, useState } from 'react';
import { IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonFooter, useIonViewDidEnter, IonBackButton, IonAlert, IonMenu, IonToast, IonIcon, IonItem, IonLabel, IonToggle, IonInput, IonDatetime, IonSelectOption, IonSelect, IonDatetimeButton, IonModal } from '@ionic/react';
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
} from '../../firebase/controller';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { menuController } from '@ionic/core/components';
import { refreshOutline } from 'ionicons/icons';
import './Calendar.css';

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
  const [newJobTotalHours, setNewJobTotalHours] = useState<number>(0);
  const [newJobPerDayHours, setNewJobPerDayHours] = useState<number>(0);
  const [newJobEndDate, setNewJobEndDate] = useState<boolean>(false);
  const [newJobScheduled, setNewJobScheduled] = useState<boolean>(true);
  
  const [showShippingCalendar, setShowShippingCalendar] = useState<boolean>(false);
  const [showInHandCalendar, setShowInHandCalendar] = useState<boolean>(false);

  const resetValues = () => {
    setNewJobTitle('');
    setNewJobCompanyName('');
    setNewJobSelectedDate('');
    setNewJobShippingDate(null);
    setNewJobInHandDate(null);
    setNewJobColor('');
    setNewJobCalendar(''); 
    setNewJobTotalHours(0);
    setNewJobPerDayHours(0);
    setNewJobEndDate(false);
    setNewJobScheduled(true);
    setShowShippingCalendar(false);
    setShowInHandCalendar(false);
  }

  const calendarColors = ['Blue','Green','Purple','Pink','Orange','Yellow','Red','Light Blue','Light Green','Light Purple','Light Pink','Light Orange','Light Yellow','Light Red']

  // New state for managing calendar names and toggles
  const [calendarNames, setCalendarNames] = useState<string[]>([]);
  const [activeCalendars, setActiveCalendars] = useState<{[key: string]: boolean}>({});

  useIonViewDidEnter(() => {
    setTimeout(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) { calendarApi.updateSize(); calendarApi.gotoDate(new Date()); }
    }, 200);
  });

  const handleLogout = async () => {
    try { await signOut(auth); history.push('/login');
    } catch (error) { console.error('Error signing out:', error); }
  };

  const handleTodayButtonClick = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) { calendarApi.today(); }
  };

  //////////////////////////////  REAL TIME UPDATING  //////////////////////////////
  useEffect(() => {
    const unsubscribe = subscribeToJobs((jobs) => {
      setMyJobs(jobs);
      // updateEventsFromJobs(jobs);
    });

    return () => unsubscribe();
  }, []);

  //////////////////////////////  CALENDAR NAMES  //////////////////////////////
  useEffect(() => {
    getCalendarNames().then((names) => {
      setCalendarNames(names);
      
      // Initialize all calendars as active
      const initialActiveState = names.reduce((acc, name) => ({ ...acc, [name]: true }), {});
      setActiveCalendars(initialActiveState);
    }).catch((error) => {
      console.error("Error fetching calendar names:", error);
    });
  }, [refresh]);

  const refreshButtonClicked = () => {
    setRefresh(prevRefresh => !prevRefresh);
  }

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
  interface Event { 
    jobID: string; 
    title: string; 
    date: string; 
    backgroundColor: string;
  }

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

  //////////////////////////////  HANDLE DATE CLICKED  //////////////////////////////
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
  const handleDateClick = (arg:any) => {
    const formattedDate = formatDateToView(arg.dateStr);
    setNewJobSelectedDate(formattedDate)

    openSecondMenu()
  }

  const createNewJob = async () => {
    const newJobInformation = {
      backgroundColor: newJobColor,
      calendarName: newJobCalendar,
      hours: newJobTotalHours,
      perDayHours: newJobPerDayHours,
      title: newJobTitle,
      companyName: newJobCompanyName,
      startDate: newJobSelectedDate,
      endDate: newJobEndDate,
      scheduled: newJobScheduled,
      shippingDate: newJobShippingDate,
      inHandDate: newJobInHandDate,
    };
    await menuController.close('newJobMenu');
    await createJobOnFirebase(newJobInformation);
  };


  //////////////////////////////  HANDLE EVENTS BEING CLICKED  //////////////////////////////
  const handleEventClick = (info: any) => {
    const { event } = info;
    const [titleBeforeColon] = event.title.split(':');
    setMyTitle(titleBeforeColon);
    setMyJobNumber(event.extendedProps.jobID);

    const formattedDate = formatDateToView(event.startStr);
    setMyJobDate(formattedDate);

    openFirstMenu();
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
  const [selectedEventID, setSelectedEventID] = useState<number | null>(null);

  const handleDeleteEvent = (event: any) => {
    setSelectedEventID(event.extendedProps.jobID);
    setShowDeleteEventAlert(true);
  };

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
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

  const handleDeleteJob = () => { 
    setShowDeleteJobAlert(true); 
  };

  const confirmDeleteJob = async () => {
    console.log('baleted')
    deleteJobById(myJobNumber)
    setShowDeleteJobAlert(false);
    await menuController.close('selectedJobMenu');
  };

  //////////////////////////////  SIDE MENUS  //////////////////////////////
  async function openFirstMenu() { await menuController.open('selectedJobMenu'); }
  async function openSecondMenu() { await menuController.open('newJobMenu'); }

  const handleMenuDismissed = () => {
    resetValues()
  };
  // async function openEndMenu() { await menuController.open('end'); }


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

  return (
    <>
      <IonMenu menuId="selectedJobMenu" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{myJobDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div>{myTitle}</div>
          <div>
            {myJobNumber}
          </div>
        </IonContent>
        <IonButton color="danger" onClick={handleDeleteJob}>Delete Job</IonButton>
      </IonMenu>

      <IonMenu menuId="newJobMenu" contentId="main-content" onIonDidClose={handleMenuDismissed}>
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
              value={newJobTotalHours}
              onIonChange={e => setNewJobTotalHours(parseFloat(e.detail.value!))}
            />
          </IonItem>

          <IonItem>
            <IonLabel slot="start">PerDay</IonLabel>
            <IonInput
              type="number"
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
              onIonChange={e => setNewJobColor(e.detail.value)}
              interface="popover" // Use popover for immediate selection
            >
              {calendarColors.map(color => (
                <IonSelectOption key={color} value={color}>
                  {color}
                </IonSelectOption>
              ))}
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


      {/* <IonMenu side="end" contentId="main-content">
        <IonHeader>
          <IonToolbar>
            <IonTitle>End Menu</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">This is the end menu content.</IonContent>
      </IonMenu> */}

      <IonPage id="main-content" className='mainContent'>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton></IonBackButton>
            </IonButtons>
              <IonTitle>Reliable Calendar</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleLogout}>Logout</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          {/* <IonButton expand="block" onClick={openFirstMenu}>
            Open First Menu
          </IonButton>
          <IonButton expand="block" onClick={openSecondMenu}>
            Open Second Menu
          </IonButton>
          <IonButton expand="block" onClick={openEndMenu}>
            Open End Menu
          </IonButton> */}
          <div className='mainPageHolder'>
            <div className='frank'>
              {/* Render Toggle buttons */}
              {calendarNames.map((name) => (
                <IonItem key={name}>
                  <IonLabel>{name}</IonLabel>
                  <IonToggle
                    checked={activeCalendars[name]}
                    onIonChange={() => handleToggleCalendar(name)}
                  />
              {name !== "main" && name !== 'shipping' && ( // Conditionally render the delete button
                <IonButton 
                  color="danger"
                  slot="end"
                  onClick={() => handleDeleteCalendar(name)}
                >
                  X
                </IonButton>
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
              <IonButton onClick={refreshButtonClicked}>
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </div>
            <div className='calendarHolder'>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialDate="2025-07-01"
                initialView="dayGridYear"
                height="87vh"
                editable={true}
                events={filteredEvents}
                customButtons={{
                  myTodayButton: {
                    text: 'Today',
                    click: handleTodayButtonClick,
                  }
                }}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridYear,dayGridMonth,dayGridWeek,dayGridDay,myTodayButton'
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
            message={`Are you sure you want to delete the calendar "${calendarNameToDelete}"?`}
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
          <IonToolbar>
            <IonTitle size="small">© 2025 Dancing Goat Studios</IonTitle>
          </IonToolbar>
        </IonFooter>
      </IonPage>
    </>
  );
};

export default Calendar;
